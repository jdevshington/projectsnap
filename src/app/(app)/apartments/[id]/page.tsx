// src/app/(app)/apartments/[id]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getApartmentById } from "@/features/apartments/queries";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import {
  ChevronLeft,
  Building2,
  MapPin,
  FileText,
  Calendar,
  ImageIcon,
} from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Apartment Record" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApartmentDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const [apartment, { t }] = await Promise.all([
    getApartmentById(id, user.id),
    getT(),
  ]);

  if (!apartment) notFound();

  const fields = [
    {
      icon: Building2,
      label: t("apartments.aptNumber"),
      value: apartment.apartment_number,
    },
    {
      icon: MapPin,
      label: t("apartments.location"),
      value: apartment.location,
    },
    {
      icon: Calendar,
      label: t("apartments.recordedOn"),
      value: formatDateTime(apartment.created_at),
    },
    {
      icon: Calendar,
      label: t("apartments.lastUpdated"),
      value: formatDateTime(apartment.updated_at ?? apartment.created_at),
    },
    ...(apartment.notes
      ? [
          {
            icon: FileText,
            label: t("apartments.notes"),
            value: apartment.notes,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        href="/apartments"
        className="mb-6 flex items-center gap-1 text-sm text-[#6F6F6C] transition hover:text-[#111110]"
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
        {t("common.back")}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
          Apt {apartment.apartment_number}
        </h1>
        <Link
          href={`/apartments/${apartment.id}/edit`}
          className="rounded-lg border border-[#E2E2E0] px-3 py-2 text-sm font-medium transition hover:bg-[#F9F9F8]"
        >
          {t("apartments.edit")}
        </Link>
      </div>

      {/* Fields */}
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

      {/* Photos */}
      {apartment.photos.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon
              size={14}
              strokeWidth={1.75}
              className="text-[#ADADAA]"
            />
            <p className="text-xs font-medium uppercase tracking-widest text-[#6F6F6C]">
              Photos ({apartment.photos.length})
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {apartment.photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square overflow-hidden rounded-lg border border-[#E2E2E0] bg-[#F9F9F8]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.public_url}
                  alt={`Photo ${photo.id}`}
                  className="h-full w-full object-cover transition hover:opacity-90"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
