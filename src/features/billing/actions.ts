// src/features/billing/actions.ts
//
// Server Actions for user-initiated billing flows. Mirrors the pattern in
// features/profile/actions.ts and features/apartments/actions.ts:
//   "use server" → createClient() → getUser() → Zod safeParse →
//   business logic → revalidatePath → ActionState<T>.
//
// Two actions:
//   * getBillingOverview: current subscription state for the /profile UI.
//   * cancelSubscription: calls PayPal's cancel API. The actual status
//     flip to 'canceled' happens when PayPal sends
//     BILLING.SUBSCRIPTION.CANCELLED via webhook — this action never
//     writes subscription state directly. The webhook is the only source
//     of truth for that.

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscriptionSchema, getBillingOverviewSchema } from "./schema";
import { getSubscription, getIsExempt, hasPaidAccess, type SubscriptionRow } from "./queries";
import { paypalFetch } from "@/lib/paypal/client";
import type { ActionState } from "@/lib/action-state";

export interface BillingOverview {
  subscription: SubscriptionRow | null;
  /** True if the account was granted a permanent admin bypass. Used for a
   *  small "Exempt account" badge in the UI. */
  isExempt: boolean;
  /** Whether the user currently has paid access. This is a UI hint for
   *  deciding what to render — it is NOT a security gate. It's the exact
   *  same has_paid_access(uid) result the (per-page) access gate uses, so
   *  the UI and the actual gate can never disagree. */
  hasAccess: boolean;
}

export async function getBillingOverview(): Promise<ActionState<BillingOverview>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = getBillingOverviewSchema.safeParse({});
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  // Three independent reads, done in parallel. hasPaidAccess() is the
  // single source of truth (the has_paid_access SQL function) — we call
  // it here rather than recomputing the status/period-end logic by hand,
  // so the UI can never drift from what the actual access gate decides.
  const [subscription, isExempt, hasAccess] = await Promise.all([
    getSubscription(),
    getIsExempt(),
    hasPaidAccess(),
  ]);

  return {
    success: { subscription, isExempt, hasAccess },
  };
}

/** User-initiated cancellation. Calls PayPal's cancel-subscription
 *  endpoint, which schedules cancellation at the end of the current
 *  billing cycle. PayPal then fires BILLING.SUBSCRIPTION.CANCELLED, which
 *  the webhook handler turns into status='canceled' in the DB.
 *
 *  We deliberately do NOT touch the local DB here — the webhook is the
 *  source of truth for subscription state. This action only signals
 *  intent to PayPal. Per policy: access continues until
 *  current_period_end, which matches PayPal's default cancel behavior. */
export async function cancelSubscription(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = cancelSubscriptionSchema.safeParse({});
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("paypal_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subErr) return { error: subErr.message };
  if (!sub?.paypal_subscription_id) {
    return { error: "No active subscription to cancel." };
  }
  if (sub.status === "canceled" || sub.status === "expired") {
    return { error: "Subscription is already canceled." };
  }

  try {
    await paypalFetch(`/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "User requested cancellation from /profile" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel subscription.";
    return { error: message };
  }

  // Don't write to the DB here — the webhook will. Revalidate so the
  // /profile UI re-reads getBillingOverview() once the webhook lands.
  revalidatePath("/profile");
  revalidatePath("/billing");

  return { success: true };
}
