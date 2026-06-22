// app/(app)/apartments/[id]/edit/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/features/apartments/queries";
import { ApartmentForm } from "@/features/apartments/components/apartment-form";
import { PhotoManager } from "@/features/apartments/components/photo-manager";
import { getT } from "@/lib/i18n/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditApartmentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [apartment, { t }] = await Promise.all([
    getApartmentById(id, user!.id),
    getT(),
  ]);

  if (!apartment) notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        href={`/apartments/${id}`}
        className="mb-6 flex items-center gap-1 text-sm text-[#6F6F6C] transition hover:text-[#111110]"
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
        {t("common.back")}
      </Link>

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        {t("apartments.editApartment")}
      </h1>

      {/* Existing photos — delete from here */}
      {apartment.photos.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#E2E2E0] bg-white p-4">
          <PhotoManager photos={apartment.photos} />
        </div>
      )}

      {/* Form — edit fields + add new photos */}
      <ApartmentForm apartment={apartment} />
    </main>
  );
}
