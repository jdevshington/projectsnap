// src/app/(app)/billing/canceled/page.tsx
//
// PayPal's cancel_url — the user backed out of checkout before approving.
// Not charged, no subscription created. NOT gated by requirePaidAccess()
// for the same reason as /billing itself.

import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Checkout canceled" };

export default async function BillingCanceledPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { t } = await getT();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center">
      <XCircle size={40} strokeWidth={1.5} className="mb-4 text-[#6F6F6C]" />
      <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
        {t("billing.canceled")}
      </h1>
      <p className="mt-2 text-sm text-[#6F6F6C]">{t("billing.canceledExplainer")}</p>

      <Link
        href="/billing"
        className="mt-6 rounded-lg bg-[#111110] px-5 py-2.5 text-sm font-medium text-white"
      >
        {t("billing.tryAgain")}
      </Link>
    </main>
  );
}
