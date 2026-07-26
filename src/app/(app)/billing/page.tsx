// src/app/(app)/billing/page.tsx
//
// Pricing + checkout. NOT gated by requirePaidAccess() — this is exactly
// the page a user without paid access needs to reach.

import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { getBillingOverview } from "@/features/billing/actions";
import { PayPalButton } from "@/features/billing/components/paypal-button";

export const metadata = { title: "Subscribe" };

export default async function BillingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [{ t }, overviewResult] = await Promise.all([
    getT(),
    getBillingOverview(),
  ]);

  const overview =
    overviewResult && "success" in overviewResult
      ? overviewResult.success
      : null;

  // Already paid (or exempt) — no need to see the pricing page.
  if (overview?.hasAccess) {
    redirect("/dashboard");
  }

  const configError = !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    ? t("billing.errorConfig")
    : null;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#111110]">
        {t("billing.title")}
      </h1>
      <p className="mb-6 text-sm text-[#6F6F6C]">{t("billing.subtitle")}</p>

      <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[#6F6F6C]">
          {t("billing.features")}
        </p>
        <ul className="mt-2 space-y-2">
          {(
            [
              "billing.featureUnlimited",
              "billing.featureSupport",
              "billing.featureCancel",
            ] as const
          ).map((key) => (
            <li
              key={key}
              className="flex items-start gap-2 text-sm text-[#111110]"
            >
              <Check
                size={15}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-[#111110]"
              />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <PayPalButton initialError={configError} />
      </div>
    </main>
  );
}
