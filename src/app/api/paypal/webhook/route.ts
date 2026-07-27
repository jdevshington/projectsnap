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
import { getTrialUsed } from "@/features/billing/queries";
import {
  sendPaymentFailed,
  sendPaymentSucceeded,
  sendSubscriptionCanceled,
  sendTrialStarted,
} from "@/lib/email/resend";
import { getUserEmail } from "@/lib/email/get-user-email";
import {
  extractWebhookHeaders,
  verifyWebhookSignature,
  mapPayPalStatusToInternal,
  type InternalStatus,
  type PayPalEvent,
  type PayPalSaleEvent,
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
    return NextResponse.json(
      { error: "Missing PayPal verification headers." },
      { status: 400 }
    );
  }

  let verification;
  try {
    verification = await verifyWebhookSignature({ rawBody, ...headers });
  } catch (err) {
    console.error(
      "[paypal webhook] signature verification transport error",
      err
    );
    return NextResponse.json(
      { error: "Signature verification failed (transport)." },
      { status: 500 }
    );
  }

  if (!verification.valid) {
    console.warn(
      "[paypal webhook] signature verification FAILED",
      verification.verificationStatus
    );
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
    console.error("[paypal webhook] handler error", err, {
      event_type: event.event_type,
    });
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleEvent(event: PayPalEvent): Promise<void> {
  // Subscription state only lives in BILLING.SUBSCRIPTION.* events.
  // PAYMENT.SALE.* events still need to fire emails but don't write
  // to the subscriptions table — billing_info on the subscription
  // event already captures the resulting state. CHECKOUT.ORDER.* we
  // ignore entirely (the subscription flow is what we care about).
  if (event.event_type.startsWith("CHECKOUT.ORDER.")) {
    return;
  }

  // PAYMENT.SALE.* events: no subscription DB write, but still need
  // an email. Resolve the user from the billing agreement id (which
  // IS the paypal_subscription_id on the subscriptions row) and send.
  if (event.event_type.startsWith("PAYMENT.SALE.")) {
    await handleSaleEmail(event as PayPalSaleEvent);
    return;
  }

  // Everything below this point is BILLING.SUBSCRIPTION.* — the only
  // events that touch the subscriptions table.
  const subEvent = event as PayPalSubscriptionEvent;
  const resource = subEvent.resource;
  if (!resource?.id) {
    console.warn("[paypal webhook] subscription event missing resource.id");
    return;
  }

  let internalStatus: InternalStatus = mapPayPalStatusToInternal(
    resource.status
  );
  const isTrial =
    resource.billing_info?.cycle_executions?.[0]?.tenure_type === "TRIAL";
  // PayPal reports resource.status = "ACTIVE" during the trial cycle too
  // (not just "incomplete"), so the trial override needs to catch that
  // case as well — otherwise a trialing subscription gets stored as
  // "active" and /profile shows the wrong label during the free week.
  if (
    isTrial &&
    (internalStatus === "trialing" ||
      internalStatus === "incomplete" ||
      internalStatus === "active")
  ) {
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
    .select("user_id, status, current_period_end")
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
    console.error(
      "[paypal webhook] cannot resolve user for subscription",
      resource.id
    );
    await supabase.from("billing_incidents").insert({
      paypal_subscription_id: resource.id,
      event_type: event.event_type,
      raw_payload: event as unknown as Record<string, unknown>,
      user_id: null,
      reason: "cannot_resolve_user",
    });
    return;
  }

  // Second-trial prevention: only applies to the ACTIVATED event when
  // the user would otherwise start a new trial. If this user has
  // already consumed a trial (profiles.trial_used_at is set), skip the
  // trial period and bill them immediately. We do NOT re-write
  // trial_used_at — it must point at the original trial start so
  // future audits can see when the first trial happened.
  const isActivated = event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED";
  if (isActivated && internalStatus === "trialing") {
    const trialUsedAt = await getTrialUsed(userId);
    if (trialUsedAt) {
      internalStatus = "active";
    }
  }

  // A refund sets status='expired' directly (immediate access loss) and
  // then explicitly cancels the subscription in PayPal — that PayPal
  // cancellation fires its OWN async CANCELLED webhook afterward, which
  // would otherwise downgrade 'expired' back to 'canceled' (a weaker,
  // grace-period state) and show a misleading "access until <date>" in
  // the UI. 'expired' is a terminal state; never let CANCELLED overwrite it.
  if (existing?.status === "expired" && internalStatus === "canceled") {
    internalStatus = "expired";
  }

  const nextPeriodEnd =
    resource.billing_info?.next_billing_time ?? existingPeriodEnd;

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
    cancel_at:
      internalStatus === "canceled"
        ? resource.status_change_time ?? null
        : null,
    canceled_at:
      internalStatus === "canceled"
        ? resource.status_change_time ?? null
        : null,
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

  // Stamp the trial as consumed ONLY if this ACTIVATED event started a
  // new trial and the user hadn't already used one. If we already
  // overrode internalStatus to "active" above (second trial prevention),
  // we do NOT touch trial_used_at — it stays pointing at the original
  // trial so the audit trail is preserved.
  if (isActivated && internalStatus === "trialing") {
    const { error: stampErr } = await supabase
      .from("profiles")
      .update({ trial_used_at: new Date().toISOString() })
      .eq("id", userId);
    if (stampErr) {
      // Non-fatal: the subscription row is the source of truth for
      // access. Log and let a future event retry the stamp if needed
      // (no — this is a one-way write, it won't be retried by PayPal;
      // if it fails the worst case is the user could in theory start
      // another trial, but the subscription status is still "active"
      // so they pay either way).
      console.error("[paypal webhook] trial_used_at stamp failed", stampErr, {
        userId,
      });
    }
  }

  // Email dispatch for BILLING.SUBSCRIPTION.* events. All sends are
  // fire-and-forget at this layer: the senders themselves swallow
  // Resend errors (see lib/email/resend.ts). We still guard with
  // try/catch so a malformed Date or unexpected type error can't take
  // the webhook down.
  try {
    await sendSubscriptionEmail(
      event,
      subEvent,
      userId,
      internalStatus,
      nextPeriodEnd
    );
  } catch (err) {
    console.error("[paypal webhook] email dispatch threw", err, {
      event_type: event.event_type,
      userId,
    });
  }
}

// Email dispatch for PAYMENT.SALE.* events. No subscription row write —
// the corresponding BILLING.SUBSCRIPTION.* event already covers state.
// We only need to resolve the user and notify.
async function handleSaleEmail(event: PayPalSaleEvent): Promise<void> {
  const billingAgreementId = event.resource.billing_agreement_id;
  if (!billingAgreementId) {
    console.warn(
      "[paypal webhook] PAYMENT.SALE event missing billing_agreement_id",
      event.resource.id
    );
    return;
  }

  const supabase = createAdminClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("user_id, current_period_end")
    .eq("paypal_subscription_id", billingAgreementId)
    .maybeSingle();

  if (error) {
    console.error(
      "[paypal webhook] PAYMENT.SALE subscription lookup error",
      error,
      {
        billingAgreementId,
      }
    );
    return;
  }
  if (!sub?.user_id) {
    console.warn(
      "[paypal webhook] PAYMENT.SALE could not resolve user",
      billingAgreementId
    );
    return;
  }

  const userId = sub.user_id;
  const to = await getUserEmail(userId);
  if (!to) {
    console.warn("[paypal webhook] PAYMENT.SALE could not resolve email", {
      userId,
    });
    return;
  }

  if (event.event_type === "PAYMENT.SALE.COMPLETED") {
    const amount = event.resource.amount
      ? `${event.resource.amount.total} ${event.resource.amount.currency}`
      : "";
    const nextBillingDate = sub.current_period_end
      ? new Date(sub.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    try {
      await sendPaymentSucceeded(to, amount, nextBillingDate);
    } catch (err) {
      console.error(
        "[paypal webhook] PAYMENT.SALE.COMPLETED email threw",
        err,
        { userId }
      );
    }
    return;
  }

  if (event.event_type === "PAYMENT.SALE.DENIED") {
    try {
      await sendPaymentFailed(to, null);
    } catch (err) {
      console.error("[paypal webhook] PAYMENT.SALE.DENIED email threw", err, {
        userId,
      });
    }
    return;
  }

  // PAYMENT.SALE.REFUNDED — no email per the spec.
}

// Email dispatch for BILLING.SUBSCRIPTION.* events. Routing per the
// spec:
//   ACTIVATED       → sendTrialStarted (if trialing) or
//                     sendPaymentSucceeded (if active / returning user)
//   RENEWED         → sendPaymentSucceeded
//   PAYMENT.FAILED  → sendPaymentFailed
//   CANCELLED       → sendSubscriptionCanceled
async function sendSubscriptionEmail(
  event: PayPalEvent,
  subEvent: PayPalSubscriptionEvent,
  userId: string,
  internalStatus: InternalStatus,
  nextPeriodEnd: string | null
): Promise<void> {
  const eventType = event.event_type;

  // Events we don't send email for.
  if (
    eventType === "BILLING.SUBSCRIPTION.CREATED" ||
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED" ||
    eventType === "BILLING.SUBSCRIPTION.UPDATED"
  ) {
    return;
  }

  const to = await getUserEmail(userId);
  if (!to) {
    console.warn("[paypal webhook] could not resolve email for billing event", {
      userId,
      event_type: eventType,
    });
    return;
  }

  const trialEndDate = nextPeriodEnd
    ? new Date(nextPeriodEnd)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
    if (internalStatus === "trialing") {
      await sendTrialStarted(to, trialEndDate);
    } else {
      // Returning customer — the second-trial prevention path
      // promoted them straight to "active". Treat as a successful
      // first paid payment.
      const amount = subEvent.resource.billing_info?.last_payment?.amount
        ? `${subEvent.resource.billing_info.last_payment.amount.value} ${subEvent.resource.billing_info.last_payment.amount.currency_code}`
        : "";
      await sendPaymentSucceeded(to, amount, trialEndDate);
    }
    return;
  }

  if (eventType === "BILLING.SUBSCRIPTION.RENEWED") {
    const amount = subEvent.resource.billing_info?.last_payment?.amount
      ? `${subEvent.resource.billing_info.last_payment.amount.value} ${subEvent.resource.billing_info.last_payment.amount.currency_code}`
      : "";
    const nextBilling = nextPeriodEnd
      ? new Date(nextPeriodEnd)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await sendPaymentSucceeded(to, amount, nextBilling);
    return;
  }

  if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    // PayPal does not consistently include a next-retry timestamp in
    // the webhook payload, so we don't promise a date in the email —
    // the template already handles the "no date" branch.
    await sendPaymentFailed(to, null);
    return;
  }

  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    // Access runs through current_period_end, which we already
    // resolved above (nextPeriodEnd falls back to existingPeriodEnd).
    const accessUntil = nextPeriodEnd ? new Date(nextPeriodEnd) : new Date();
    await sendSubscriptionCanceled(to, accessUntil);
    return;
  }
}
