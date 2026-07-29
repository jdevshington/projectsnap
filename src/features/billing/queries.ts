// src/features/billing/queries.ts
//
// Read-only queries for billing data. Mirrors features/profile/queries.ts
// (explicit .select() columns, maybeSingle() for nullable rows).
//
// hasPaidAccess() is wrapped in cache() so multiple Server Components in
// the same request (a gated page + the layout it renders under) only hit
// the DB once per request.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";

export type SubscriptionRow = {
  user_id: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired" | "incomplete";
  plan: "monthly" | "yearly";
  paypal_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Read the calling user's subscription row, or null if none exists. */
export const getSubscription = cache(async (): Promise<SubscriptionRow | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "user_id, status, plan, paypal_subscription_id, current_period_start, current_period_end, cancel_at, canceled_at, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SubscriptionRow | null;
});

/** Read whether the calling user is exempt (admin-granted free access). */
export const getIsExempt = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_exempt")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.is_exempt);
});

/** Server-side access check. Calls the has_paid_access(uid) SQL function —
 *  the single source of truth for "does this user have paid access?". It
 *  handles the is_exempt short-circuit, the status check, and the
 *  current_period_end check all in one place. Nothing outside this
 *  function should ever reimplement that logic — if the grace-period
 *  rules change in SQL, every caller of hasPaidAccess() picks it up
 *  automatically. */
export const hasPaidAccess = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_paid_access", {
    uid: user.id,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
});

/** Read profiles.trial_used_at for the given userId. Returns null if the
 *  user has never started a trial, or if the row is missing. Uses the
 *  admin client because the webhook calls this without a user session
 *  (PayPal is the caller, not a logged-in user). */
export async function getTrialUsed(userId: string): Promise<Date | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("trial_used_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.trial_used_at) return null;
  return new Date(data.trial_used_at);
}

export type BillingEventRow = {
  id: string;
  event_type:
    | "trial_started"
    | "payment_succeeded"
    | "payment_failed"
    | "subscription_canceled"
    | "refund_issued";
  amount: number | null;
  currency: string | null;
  occurred_at: string;
};

/** Read the calling user's billing history, most recent first. Used by
 *  /profile to render the billing history section. Capped at 20 rows —
 *  this is a UI convenience list, not an export/audit tool. */
export const getBillingHistory = cache(async (): Promise<BillingEventRow[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_events")
    .select("id, event_type, amount, currency, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data as BillingEventRow[]) ?? [];
});

/** Insert a row into billing_events. Called from the webhook and the
 *  refund route, right alongside the corresponding email send — same
 *  event, same place in the code, so the history and the emails a user
 *  received can never drift apart. Takes an already-constructed admin
 *  client (both callers already have one) instead of creating a new
 *  one, and never throws — a failed history write should never break
 *  the webhook or the refund flow; it's a nice-to-have UI list, not a
 *  source of truth for access. */
export async function logBillingEvent(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    userId: string;
    eventType: BillingEventRow["event_type"];
    amount?: string | null;
    currency?: string | null;
    occurredAt?: Date;
  }
): Promise<void> {
  const { error } = await supabase.from("billing_events").insert({
    user_id: params.userId,
    event_type: params.eventType,
    amount: params.amount ? Number(params.amount) : null,
    currency: params.currency ?? null,
    occurred_at: (params.occurredAt ?? new Date()).toISOString(),
  });

  if (error) {
    console.error("[billing_events] insert failed", error, {
      userId: params.userId,
      eventType: params.eventType,
    });
  }
}
