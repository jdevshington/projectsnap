// src/app/api/paypal/webhook/route.ts
//
// PayPal calls this endpoint directly over HTTP. It is NOT a Server Action
// — PayPal doesn't carry the Next.js auth cookie or have a user session.
// The webhook's only job is to translate PayPal events into rows in
// public.subscriptions.
//
// Critical security properties:
//   1. Raw body is preserved byte-exact for signature verification.
//   2. Signature is verified against PayPal BEFORE we touch the database.
//   3. We use the SERVICE ROLE key, not the user client — the caller is
//      PayPal (no auth.uid()), we need to write regardless of RLS.
//   4. We always return 200 for verified events (even ones we don't
//      handle) — PayPal retries non-2xx for 3 days.
//   5. We are idempotent: paypal_subscription_id is UNIQUE, so
//      re-deliveries hit an ON CONFLICT path instead of duplicating rows.

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractWebhookHeaders,
  verifyWebhookSignature,
  mapPayPalStatusToInternal,
  type InternalStatus,
  type PayPalEvent,
  type PayPalSubscriptionEvent,
} from "@/lib/paypal";

export const runtime = "nodejs"; // needs Node, not Edge (Buffer, process.env)
export const dynamic = "force-dynamic"; // never cache this

export async function POST(request: NextRequest) {
  // 1. Raw body, byte-exact.
  const rawBody = await request.text();

  // 2. Extract & verify signature.
  const headers = extractWebhookHeaders(request.headers);
  if (!headers) {
    return NextResponse.json({ error: "Missing PayPal verification headers." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyWebhookSignature({ rawBody, ...headers });
  } catch (err) {
    console.error("[paypal webhook] signature verification transport error", err);
    return NextResponse.json({ error: "Signature verification failed (transport)." }, { status: 500 });
  }

  if (!verification.valid) {
    console.warn("[paypal webhook] signature verification FAILED", verification.verificationStatus);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // 3. Parse. If it isn't JSON we recognize, ack and move on.
  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 4. Dispatch.
  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[paypal webhook] handler error", err, { event_type: event.event_type });
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleEvent(event: PayPalEvent): Promise<void> {
  if (!event.event_type.startsWith("BILLING.SUBSCRIPTION.")) {
    return; // ack, don't process — we don't 500 on event types we ignore
  }

  const subEvent = event as PayPalSubscriptionEvent;
  const resource = subEvent.resource;
  if (!resource?.id) {
    console.warn("[paypal webhook] subscription event missing resource.id");
    return;
  }

  let internalStatus: InternalStatus = mapPayPalStatusToInternal(resource.status);

  const isTrial = resource.billing_info?.cycle_executions?.[0]?.tenure_type === "TRIAL";
  if (isTrial && (internalStatus === "trialing" || internalStatus === "incomplete")) {
    internalStatus = "trialing";
  }

  const supabase = createAdminClient();

  // We also fetch current_period_end from the existing row. The webhook
  // only sends a new value for it on some event types — on others
  // (SUSPENDED, PAYMENT.FAILED) the field is missing, and writing null
  // would accidentally revoke access mid-period. Fall back to the stored
  // value.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, current_period_end")
    .eq("paypal_subscription_id", resource.id)
    .maybeSingle();

  let userId: string | null = existing?.user_id ?? null;
  const existingPeriodEnd: string | null = existing?.current_period_end ?? null;

  if (!userId) {
    const email = resource.subscriber?.email_address?.toLowerCase();
    if (email) {
      // NOTE: supabase.auth.admin.listUsers() in the installed SDK version
      // only supports { page, perPage } — it does NOT filter by email
      // server-side. An earlier version of this handler relied on it with
      // perPage: 1, which meant the "resolve by email" fallback never
      // actually worked (it just checked an arbitrary single user). This
      // RPC does the lookup correctly via a direct, indexed query.
      const { data: matchedId, error: lookupErr } = await supabase.rpc(
        "get_user_id_by_email",
        { p_email: email }
      );
      if (lookupErr) {
        console.error("[paypal webhook] get_user_id_by_email error", lookupErr);
      } else if (matchedId) {
        userId = matchedId as string;
      }
    }
  }

  if (!userId) {
    // Record the incident for admin reconciliation instead of just
    // console.error — a paying customer's event should never vanish
    // silently. Still return 200: this is a state mismatch, not a
    // transient error, so retrying won't help.
    console.error("[paypal webhook] cannot resolve user for subscription", resource.id);
    await supabase.from("billing_incidents").insert({
      paypal_subscription_id: resource.id,
      event_type: event.event_type,
      raw_payload: event as unknown as Record<string, unknown>,
      user_id: null,
      reason: "cannot_resolve_user",
    });
    return;
  }

  const nextPeriodEnd = resource.billing_info?.next_billing_time ?? existingPeriodEnd;

  const upsertPayload = {
    user_id: userId,
    status: internalStatus,
    // v1 is monthly-only. This only matters as a fallback for the rare
    // case where create-subscription's placeholder insert failed and this
    // webhook is doing the FIRST insert for this user — plan is NOT NULL
    // with no default, so omitting it would throw on that specific path.
    plan: "monthly" as const,
    paypal_subscription_id: resource.id,
    current_period_start: resource.start_time ?? null,
    current_period_end: nextPeriodEnd,
    cancel_at: internalStatus === "canceled" ? resource.status_change_time ?? null : null,
    canceled_at: internalStatus === "canceled" ? resource.status_change_time ?? null : null,
  };

  // onConflict targets user_id — the table's actual PRIMARY KEY and the
  // real invariant ("one subscription row per user"), not
  // paypal_subscription_id. This matters for one specific edge case: if
  // create-subscription's placeholder insert failed (see that route's
  // comments) and this is a returning user re-subscribing, a row for
  // user_id may already exist under a DIFFERENT (old, canceled)
  // paypal_subscription_id. Targeting onConflict on paypal_subscription_id
  // in that case would attempt a fresh INSERT, which would then collide
  // with the user_id PRIMARY KEY and throw — since Postgres only checks
  // the constraint named in ON CONFLICT. Targeting user_id avoids that.
  const { error: upsertErr } = await supabase
    .from("subscriptions")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (upsertErr) {
    throw new Error(`subscriptions upsert failed: ${upsertErr.message}`);
  }
}
