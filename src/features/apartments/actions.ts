// src/features/apartments/actions.ts

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apartmentSchema } from "./schema";
import type { ActionState } from "@/lib/action-state";

export async function createApartment(
  _prevState: ActionState<string>,
  formData: FormData
): Promise<ActionState<string>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = apartmentSchema.safeParse({
    apartment_number: formData.get("apartment_number"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const { apartment_number, location, notes } = parsed.data;
  const photos = formData.getAll("photos") as File[];

  const { data: apartment, error } = await supabase
    .from("apartment_records")
    .insert({
      user_id: user.id,
      apartment_number,
      location,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const validPhotos = photos.filter((f) => f.size > 0);
  if (validPhotos.length > 0) {
    await Promise.allSettled(
      validPhotos.map(async (file) => {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${apartment.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("apartment-photos")
          .upload(path, file);

        if (uploadError) return;

        const {
          data: { publicUrl },
        } = supabase.storage.from("apartment-photos").getPublicUrl(path);

        await supabase.from("photos").insert({
          user_id: user.id,
          apartment_id: apartment.id,
          storage_path: path,
          public_url: publicUrl,
        });
      })
    );
  }

  redirect("/apartments");
}

export async function updateApartment(
  apartmentId: string,
  _prevState: ActionState<string>,
  formData: FormData
): Promise<ActionState<string>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = apartmentSchema.safeParse({
    apartment_number: formData.get("apartment_number"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const { apartment_number, location, notes } = parsed.data;
  const photos = formData.getAll("photos") as File[];

  const { error } = await supabase
    .from("apartment_records")
    .update({
      apartment_number,
      location,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", apartmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const validPhotos = photos.filter((f) => f.size > 0);
  if (validPhotos.length > 0) {
    await Promise.allSettled(
      validPhotos.map(async (file) => {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${apartmentId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("apartment-photos")
          .upload(path, file);

        if (uploadError) return;

        const {
          data: { publicUrl },
        } = supabase.storage.from("apartment-photos").getPublicUrl(path);

        await supabase.from("photos").insert({
          user_id: user.id,
          apartment_id: apartmentId,
          storage_path: path,
          public_url: publicUrl,
        });
      })
    );
  }

  redirect(`/apartments/${apartmentId}`);
}

export async function deletePhoto(
  photoId: string,
  storagePath: string
): Promise<ActionState<string>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!photo || photo.storage_path !== storagePath) {
    return { error: "Photo not found." };
  }

  const { error: storageError } = await supabase.storage
    .from("apartment-photos")
    .remove([photo.storage_path]);
  if (storageError) return { error: storageError.message };

  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: "Photo deleted." };
}
