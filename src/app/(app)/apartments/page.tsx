import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getApartments } from "@/features/apartments/queries";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Apartments" };

export default async function ApartmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [apartments, { t }] = await Promise.all([
    getApartments(user.id),
    getT(),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
          {t("apartments.title")}
        </h1>
        <Link
          href="/apartments/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
        >
          <Plus size={14} strokeWidth={2} />
          {t("apartments.addRecord")}
        </Link>
      </div>

      {apartments.length === 0 ? (
        <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-10 text-center">
          <Building2
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[#ADADAA]"
          />
          <p className="text-sm font-medium text-[#111110]">
            {t("apartments.noRecords")}
          </p>
          <p className="mt-1 text-sm text-[#6F6F6C]">
            {t("apartments.noRecordsPrompt")}
          </p>
          <Link
            href="/apartments/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
          >
            <Plus size={14} strokeWidth={2} />
            {t("apartments.addRecord")}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
          {apartments.map((apt) => (
            <Link
              key={apt.id}
              href={`/apartments/${apt.id}`}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-[#F9F9F8]"
            >
              <div className="flex items-start gap-3">
                <Building2
                  size={15}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-[#ADADAA]"
                />
                <div>
                  <p className="text-sm font-medium text-[#111110]">
                    Apt {apt.apartment_number}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6F6F6C]">
                    {apt.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#ADADAA]">
                  {formatDate(apt.created_at)}
                </span>
                <ChevronRight
                  size={14}
                  strokeWidth={1.75}
                  className="text-[#ADADAA]"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}