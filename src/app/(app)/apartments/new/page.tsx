// app/(app)/apartments/new/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ApartmentForm } from "@/features/apartments/components/apartment-form";
import { getT } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { requirePaidAccess } from "@/features/billing/gating";

export default async function NewApartmentPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await requirePaidAccess();

  const { t } = await getT();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        href="/apartments"
        className="mb-6 flex items-center gap-1 text-sm text-[#6F6F6C] transition hover:text-[#111110]"
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
        {t("common.back")}
      </Link>

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        {t("apartments.addApartment")}
      </h1>

      <ApartmentForm />
    </main>
  );
}
