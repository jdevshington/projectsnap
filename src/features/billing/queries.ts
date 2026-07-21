// src/features/billing/queries.ts
//
// Read-only queries for billing data. Mirrors features/profile/queries.ts
// (explicit .select() columns, maybeSingle() for nullable rows).
//
// hasPaidAccess() is wrapped in cache() so multiple Server Components in
// the same request (a gated page + the layout it renders under) only hit
// the DB once per request.

import { cache } from "react";
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
