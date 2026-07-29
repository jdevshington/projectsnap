// src/features/billing/components/billing-history-list.tsx
//
// Read-only list rendered on /profile below BillingStatusCard. Server
// Component — the data is already fetched server-side in page.tsx, this
// just renders it. No "card used" column: PayPal does not expose the
// buyer's card to the merchant for PayPal-wallet payments, so the only
// honest "method" to show is "PayPal".

import type { BillingEventRow } from "@/features/billing/queries";
import type { TranslationKey } from "@/lib/i18n/translations";

interface Props {
  events: BillingEventRow[];
  t: (key: TranslationKey) => string;
  locale: string;
}

const EVENT_LABEL_KEY: Record<BillingEventRow["event_type"], string> = {
  trial_started: "profile.billingEventTrialStarted",
  payment_succeeded: "profile.billingEventPaymentSucceeded",
  payment_failed: "profile.billingEventPaymentFailed",
  subscription_canceled: "profile.billingEventSubscriptionCanceled",
  refund_issued: "profile.billingEventRefundIssued",
};

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-DO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function BillingHistoryList({ events, t, locale }: Props) {
  return (
    <div className="mt-4 rounded-xl border border-[#E2E2E0] bg-white">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111110]">
          {t("profile.billingHistory")}
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#6F6F6C]">
            {t("profile.billingHistoryEmpty")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0EE]">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#111110]">
                  {t(EVENT_LABEL_KEY[event.event_type] as TranslationKey)}
                </p>
                <p className="mt-0.5 text-xs text-[#6F6F6C]">
                  {formatDateTime(event.occurred_at, locale)} · PayPal
                </p>
              </div>
              {event.amount !== null && (
                <p className="text-sm font-medium text-[#111110]">
                  {event.amount} {event.currency}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
