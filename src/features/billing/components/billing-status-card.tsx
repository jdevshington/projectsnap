"use client";

// src/features/billing/components/billing-status-card.tsx
//
// Card rendered on /profile. Shows plan, status, period end, and the
// action buttons (Cancel, Request refund).
//
//   * Cancel subscription: calls the cancelSubscription Server Action.
//   * Request refund: POSTs to /api/paypal/refund — a Route Handler
//     because it's a single button click with no form, and the 14-day
//     window is enforced server-side; the client never decides whether a
//     refund is allowed. Now gated behind an explicit confirmation step,
//     matching the Cancel flow (a refund is a bigger commitment than a
//     scheduled cancellation — it revokes access immediately).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { cancelSubscription } from "@/features/billing/actions";
import type { SubscriptionRow } from "@/features/billing/queries";

interface BillingStatusCardProps {
  subscription: SubscriptionRow | null;
  isExempt: boolean;
  hasAccess: boolean;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-DO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// Statuses where "period end" still means something to the user (they
// either have access until that date, or their access continues until
// then even though it's scheduled to lapse). 'expired' is a terminal
// state — access was already revoked (e.g. by a refund), so showing a
// stale current_period_end next to it reads as "I still have access
// until then," which is exactly backwards. 'incomplete' never had a
// meaningful period to begin with.
const STATUSES_WITH_MEANINGFUL_PERIOD_END = new Set([
  "active",
  "trialing",
  "past_due",
  "canceled",
]);

export function BillingStatusCard({
  subscription,
  isExempt,
  hasAccess,
}: BillingStatusCardProps) {
  const { t, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSubscription();
      if (result && "error" in result) {
        toast.error(t("profile.billingCancelError"));
      } else {
        toast.success(t("profile.billingCanceled"));
        setCancelOpen(false);
      }
    });
  }

  function handleRefund() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/paypal/refund", { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (body.code === "OUTSIDE_REFUND_WINDOW") {
            toast.error(t("profile.billingRefundOutsideWindow"));
          } else {
            toast.error(body.error ?? t("billing.errorGeneric"));
          }
          setRefundOpen(false);
          return;
        }
        toast.success(t("profile.billingRefundSuccess"));
        setRefundOpen(false);
      } catch {
        toast.error(t("billing.errorGeneric"));
        setRefundOpen(false);
      }
    });
  }

  if (isExempt) {
    return (
      <div className="mt-4 rounded-xl border border-[#E2E2E0] bg-white px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111110]">
          {t("profile.billing")}
        </h2>
        <p className="mt-1 text-sm text-[#6F6F6C]">
          {t("profile.billingExemptExplainer")}
        </p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="mt-4 rounded-xl border border-[#E2E2E0] bg-white px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111110]">
          {t("profile.billing")}
        </h2>
        <p className="mt-1 text-sm text-[#6F6F6C]">{t("billing.subtitle")}</p>
        <a
          href="/billing"
          className="mt-3 inline-block rounded-lg bg-[#111110] px-4 py-2 text-sm font-medium text-white"
        >
          {t("billing.paypalButton")}
        </a>
      </div>
    );
  }

  const statusKey = {
    active: "profile.billingStatusActive",
    trialing: "profile.billingStatusTrialing",
    past_due: "profile.billingStatusPastDue",
    canceled: "profile.billingStatusCanceled",
    expired: "profile.billingStatusExpired",
    incomplete: "profile.billingStatusIncomplete",
  }[subscription.status] as Parameters<typeof t>[0];

  const periodEndKey =
    subscription.status === "active"
      ? "profile.billingRenewsOn"
      : subscription.status === "trialing"
      ? "profile.billingTrialEndsOn"
      : "profile.billingAccessUntil";

  const showPeriodEnd =
    Boolean(subscription.current_period_end) &&
    STATUSES_WITH_MEANINGFUL_PERIOD_END.has(subscription.status);

  return (
    <div className="mt-4 rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111110]">
          {t("profile.billing")}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#F0F0EE]">
        <div className="bg-white px-5 py-3">
          <p className="text-xs text-[#6F6F6C]">{t("profile.billingPlan")}</p>
          <p className="mt-0.5 text-sm font-medium text-[#111110]">
            {t("profile.billingPlanMonthly")}
          </p>
        </div>
        <div className="bg-white px-5 py-3">
          <p className="text-xs text-[#6F6F6C]">{t("profile.billingStatus")}</p>
          <p className="mt-0.5 text-sm font-medium text-[#111110]">
            {t(statusKey)}
          </p>
        </div>
      </div>

      {showPeriodEnd && (
        <div className="px-5 py-3">
          <p className="text-xs text-[#6F6F6C]">{t(periodEndKey)}</p>
          <p className="mt-0.5 text-sm font-medium text-[#111110]">
            {formatDate(subscription.current_period_end, locale)}
          </p>
        </div>
      )}

      <div className="space-y-2 px-5 py-4">
        {!cancelOpen && !refundOpen ? (
          <>
            {(subscription.status === "active" ||
              subscription.status === "trialing") && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="w-full rounded-lg border border-[#E2E2E0] bg-white px-4 py-2 text-sm font-medium text-[#111110] hover:bg-[#F8F8F7]"
              >
                {t("profile.billingCancel")}
              </button>
            )}
            {subscription.status === "active" && hasAccess && (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                disabled={isPending}
                className="w-full rounded-lg border border-[#E2E2E0] bg-white px-4 py-2 text-sm text-[#6F6F6C] hover:bg-[#F8F8F7] disabled:opacity-50"
              >
                {t("profile.billingRefund")}
              </button>
            )}
          </>
        ) : cancelOpen ? (
          <div className="space-y-2">
            <p className="text-sm text-[#6F6F6C]">
              {t("billing.featureCancel")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[#E2E2E0] bg-white px-4 py-2 text-sm text-[#111110] disabled:opacity-50"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#111110] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? t("profile.billingCanceling")
                  : t("profile.billingCancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-[#6F6F6C]">
              {t("profile.billingRefundExplainer")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRefundOpen(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[#E2E2E0] bg-white px-4 py-2 text-sm text-[#111110] disabled:opacity-50"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={handleRefund}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#111110] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? t("profile.billingRefunding")
                  : t("profile.billingRefund")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
