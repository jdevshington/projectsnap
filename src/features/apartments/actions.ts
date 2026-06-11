// features/apartments/actions.ts

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FormState = { error: string } | null;

export async function createApartment(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const apartmentNumber = formData.get("apartment_number") as string;
  const location = formData.get("location") as string;
  const notes = formData.get("notes") as string;

  if (!apartmentNumber?.trim())
    return { error: "Apartment number is required." };
  if (!location?.trim()) return { error: "Location is required." };

  const { error } = await supabase.from("apartment_records").insert({
    user_id: user.id,
    apartment_number: apartmentNumber.trim(),
    location: location.trim(),
    notes: notes?.trim() || null,
  });

  if (error) return { error: error.message };

  redirect("/apartments");
}

export async function updateApartment(
  apartmentId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Not authenticated.",
    };
  }

  const apartmentNumber = formData.get(
    "apartment_number"
  ) as string;

  const location = formData.get(
    "location"
  ) as string;

  const notes = formData.get(
    "notes"
  ) as string;

  if (!apartmentNumber?.trim()) {
    return {
      error: "Apartment number is required.",
    };
  }

  if (!location?.trim()) {
    return {
      error: "Location is required.",
    };
  }

  const { error } = await supabase
    .from("apartment_records")
    .update({
      apartment_number: apartmentNumber.trim(),
      location: location.trim(),
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", apartmentId)
    .eq("user_id", user.id);

  if (error) {
    return {
      error: error.message,
    };
  }

  redirect(`/apartments/${apartmentId}`);
}