// app/(app)/apartments/new/page.tsx

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ApartmentForm } from "@/features/apartments/components/apartment-form";

export const metadata = {
  title: "Add Apartment",
};

export default function NewApartmentPage() {
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
        Add apartment record
      </h1>

      <ApartmentForm />
    </main>
  );
}
