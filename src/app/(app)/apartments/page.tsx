// app/(app)/apartments/page.tsx

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getApartments } from "@/features/apartments/queries";
import { Building2, ChevronRight, Plus } from "lucide-react";

export const metadata = {
  title: "Apartments",
};

export default async function ApartmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const apartments = await getApartments(user!.id);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
          Apartments
        </h1>
        <Link
          href="/apartments/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
        >
          <Plus size={14} strokeWidth={2} />
          Add record
        </Link>
      </div>

      {/* List */}
      {apartments.length === 0 ? (
        <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-10 text-center">
          <Building2
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[#ADADAA]"
          />
          <p className="text-sm font-medium text-[#111110]">No records yet</p>
          <p className="mt-1 text-sm text-[#6F6F6C]">
            Add your first apartment record.
          </p>
          <Link
            href="/apartments/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
          >
            <Plus size={14} strokeWidth={2} />
            Add record
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
                  {new Date(apt.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
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
