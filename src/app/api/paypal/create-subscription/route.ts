// src/app/api/paypal/create-subscription/route.ts
//
// Creates a PayPal subscription for the calling user, then writes a
// placeholder row to public.subscriptions (status='incomplete') so a
// known user_id exists before the first webhook lands.
//
// Route Handler (not a Server Action):
//   1. The PayPal JS SDK calls this as part of its approveSubscription
//      flow — it expects a subscription id from a plain fetch, not the
//      ActionState shape our Server Actions return.
//   2. Writing the placeholder needs the service role key. Keeping that
//      out of the Server Action surface limits the blast radius if a
//      future code path accidentally reuses that action elsewhere.

import { NextResponse } from "next/server";
import { paypalFetch } from "@/lib/paypal/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTrialUsed } from "@/features/billing/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const planId = process.env.PAYPAL_PLAN_ID_MONTHLY;
  if (!planId) {
    console.error("PAYPAL_PLAN_ID_MONTHLY is not set");
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 500 }
    );
  }

  // Tell the client this user has already used their trial so it can
  // skip the trial-offer UI. We do NOT block the subscription itself —
  // the webhook will mark the resulting subscription "active" instead
  // of "trialing" (see webhook handler). This is purely a UI hint.
  const trialUsedAt = await getTrialUsed(user.id);

  const created = await paypalFetch<{ id: string; status: string }>(
    "/v1/billing/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        subscriber: { email_address: user.email },
        ...(trialUsedAt && {
          plan: {
            billing_cycles: [
              {
                sequence: 1,
                pricing_scheme: {
                  fixed_price: { value: "15", currency_code: "USD" },
                },
              },
            ],
          },
        }),
        application_context: {
          brand_name: "ProjectSnap",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
          },
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/canceled`,
        },
      }),
    }
  );

  // Placeholder so the webhook's upsert (onConflict: user_id) has a known
  // row for this user even if the email lookup fallback would otherwise
  // be needed.
  const admin = createAdminClient();
  const { error: placeholderErr } = await admin.from("subscriptions").upsert(
    {
      user_id: user.id,
      status: "incomplete",
      plan: "monthly",
      paypal_subscription_id: created.id,
    },
    { onConflict: "user_id" }
  );

  if (placeholderErr) {
    console.error(
      "[create-subscription] placeholder upsert failed; relying on webhook email recovery",
      placeholderErr
    );
  }

  return NextResponse.json({
    id: created.id,
    status: created.status,
    alreadyTrialed: Boolean(trialUsedAt),
  });
}
