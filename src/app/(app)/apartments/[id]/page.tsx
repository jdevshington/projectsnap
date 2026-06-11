// app/(app)/apartments/[id]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/features/apartments/queries";
import {
  ChevronLeft,
  Building2,
  MapPin,
  FileText,
  Calendar,
} from "lucide-react";

export const metadata = {
  title: "Apartment Record",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApartmentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const apartment = await getApartmentById(id, user!.id);
  if (!apartment) notFound();

  const fields = [
    {
      icon: Building2,
      label: "Apartment number",
      value: apartment.apartment_number,
    },
    {
      icon: MapPin,
      label: "Location",
      value: apartment.location,
    },
    {
      icon: Calendar,
      label: "Recorded on",
      value: new Date(apartment.created_at).toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    ...(apartment.notes
      ? [{ icon: FileText, label: "Notes", value: apartment.notes }]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      {/* Back link */}
      <Link
        href="/apartments"
        className="mb-6 flex items-center gap-1 text-sm text-[#6F6F6C] transition hover:text-[#111110]"
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
        Apartments
      </Link>

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        Apt {apartment.apartment_number}
      </h1>

      <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-4 px-5 py-4">
            <Icon
              size={15}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-[#ADADAA]"
            />
            <div>
              <p className="text-xs text-[#6F6F6C]">{label}</p>
              <p className="mt-0.5 text-sm font-medium text-[#111110]">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
