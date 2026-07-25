// src/app/api/paypal/refund/route.ts
//
// Refund policy (confirmed with the project owner):
//   * Within 14 days of current_period_start → issue refund via PayPal AND
//     immediately mark the subscription 'expired' (lose access now).
//   * Outside the window → reject with OUTSIDE_REFUND_WINDOW; the UI then
//     offers a normal cancellation instead (access continues until
//     current_period_end).
//
// The refund decision is computed from our own DB, never trusted from the
// client.

import { NextResponse } from "next/server";
import { paypalFetch } from "@/lib/paypal/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFUND_WINDOW_DAYS = 14;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("user_id, status, current_period_start, paypal_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  if (!sub || !sub.paypal_subscription_id) {
    return NextResponse.json({ error: "No active subscription to refund." }, { status: 400 });
  }

  const periodStart = sub.current_period_start ? new Date(sub.current_period_start) : null;
  const now = new Date();
  const withinWindow =
    periodStart !== null &&
    (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) < REFUND_WINDOW_DAYS;

  if (!withinWindow) {
    return NextResponse.json(
      {
        error:
          "Refund window has closed. You can cancel instead, which keeps access until the end of the current paid period.",
        code: "OUTSIDE_REFUND_WINDOW",
      },
      { status: 400 }
    );
  }

  // BOTH start_time AND end_time are required by PayPal on this endpoint.
  // We use the same 35-day window as the upper bound — a charge older than
  // that can't be inside the 14-day refund window anyway.
  const startTime = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const endTime = now.toISOString();

  const sales = await paypalFetch<{
    // PayPal's /v1/billing/subscriptions/{id}/transactions response includes
    // a top-level `time` field on each transaction representing the actual
    // transaction time (ISO 8601 string). We sort on that, not on `id`, so
    // the most recent payment is picked even when transaction ids happen
    // not to sort lexicographically by time.
    transactions?: Array<{
      id: string;
      status: string;
      time: string;
      amount: { total: string; currency: string };
    }>;
  }>(
    `/v1/billing/subscriptions/${sub.paypal_subscription_id}/transactions?start_time=${encodeURIComponent(
      startTime
    )}&end_time=${encodeURIComponent(endTime)}`
  );

  const lastPaid = sales.transactions
    ?.filter((t) => t.status === "COMPLETED")
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];

  if (!lastPaid) {
    return NextResponse.json(
      { error: "No completed payment found to refund. Please contact support." },
      { status: 400 }
    );
  }

  await paypalFetch(`/v2/payments/captures/${lastPaid.id}/refund`, {
    method: "POST",
    body: JSON.stringify({
      amount: { value: lastPaid.amount.total, currency_code: lastPaid.amount.currency },
      reason: "BUYER_REQUEST",
    }),
  });

  // Best-effort cancel on PayPal side. We already refunded the capture, so
  // we don't want the subscription silently rebilling the user next cycle.
  // If this fails we still mark the local row 'expired' — access is revoked
  // locally regardless, and the failed cancel is logged for support follow-up.
  try {
    await paypalFetch(`/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Refunded via /refund route" }),
    });
  } catch (cancelErr) {
    console.error(
      "[refund] PayPal subscription cancel failed after refund",
      cancelErr,
      { paypal_subscription_id: sub.paypal_subscription_id }
    );
  }

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", user.id);

  if (updateErr) {
    console.error("[refund] DB update failed after PayPal refund", updateErr);
    return NextResponse.json(
      { error: "Refund issued but state update failed; contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, refunded: lastPaid.id });
}
