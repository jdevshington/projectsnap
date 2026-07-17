// features/apartments/actions.ts

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FormState = { error: string } | { success: string } | null;

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
  const photos = formData.getAll("photos") as File[];

  if (!apartmentNumber?.trim())
    return { error: "Apartment number is required." };
  if (!location?.trim()) return { error: "Location is required." };

  const { data: apartment, error } = await supabase
    .from("apartment_records")
    .insert({
      user_id: user.id,
      apartment_number: apartmentNumber.trim(),
      location: location.trim(),
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const validPhotos = photos.filter((f) => f.size > 0);
  if (validPhotos.length > 0) {
    for (const file of validPhotos) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${apartment.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("apartment-photos")
        .upload(path, file);

      if (uploadError) continue;

      const {
        data: { publicUrl },
      } = supabase.storage.from("apartment-photos").getPublicUrl(path);

      await supabase.from("photos").insert({
        user_id: user.id,
        apartment_id: apartment.id,
        storage_path: path,
        public_url: publicUrl,
      });
    }
  }

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
  if (!user) return { error: "Not authenticated." };

  const apartmentNumber = formData.get("apartment_number") as string;
  const location = formData.get("location") as string;
  const notes = formData.get("notes") as string;
  const photos = formData.getAll("photos") as File[];

  if (!apartmentNumber?.trim())
    return { error: "Apartment number is required." };
  if (!location?.trim()) return { error: "Location is required." };

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

  if (error) return { error: error.message };

  const validPhotos = photos.filter((f) => f.size > 0);
  if (validPhotos.length > 0) {
    for (const file of validPhotos) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${apartmentId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("apartment-photos")
        .upload(path, file);

      if (uploadError) continue;

      const {
        data: { publicUrl },
      } = supabase.storage.from("apartment-photos").getPublicUrl(path);

      await supabase.from("photos").insert({
        user_id: user.id,
        apartment_id: apartmentId,
        storage_path: path,
        public_url: publicUrl,
      });
    }
  }

  redirect(`/apartments/${apartmentId}`);
}

export async function deletePhoto(
  photoId: string,
  storagePath: string
): Promise<FormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  await supabase.storage.from("apartment-photos").remove([storagePath]);

  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: "Photo deleted." };
}
