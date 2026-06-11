import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/features/apartments/queries";
import { ApartmentForm } from "@/features/apartments/components/apartment-form";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditApartmentPage({
    params,
}: Props) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const apartment = await getApartmentById(
        id,
        user!.id
    );

    if (!apartment) {
        notFound();
    }

    return (
        <main className="mx-auto w-full max-w-lg px-4 py-8">
            <Link
                href={`/apartments/${id}`}
                className="mb-6 flex items-center gap-1 text-sm text-[#6F6F6C]"
            >
                <ChevronLeft size={15} />
                Apartment
            </Link>

            <h1 className="mb-6 text-xl font-semibold tracking-tight">
                Edit apartment
            </h1>

            <ApartmentForm apartment={apartment} />
        </main>
    );
}