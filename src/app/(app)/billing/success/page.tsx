// src/app/(app)/billing/success/page.tsx
//
// PayPal's return_url after the user approves the subscription. Access
// isn't guaranteed to be active yet — the webhook that flips our DB row
// to active/trialing can land a few seconds after this redirect. NOT
// gated by requirePaidAccess() for that reason: the user just paid (or is
// mid-trial-setup) and shouldn't get bounced back to /billing while the
// webhook is in flight.

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Subscribed" };

export default async function BillingSuccessPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { t } = await getT();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center">
      <CheckCircle2 size={40} strokeWidth={1.5} className="mb-4 text-[#111110]" />
      <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
        {t("billing.success")}
      </h1>
      <p className="mt-2 text-sm text-[#6F6F6C]">{t("billing.successExplainer")}</p>

      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-[#111110] px-5 py-2.5 text-sm font-medium text-white"
      >
        {t("nav.home")}
      </Link>
    </main>
  );
}
