// src/features/apartments/queries.ts

import { createClient } from "@/lib/supabase/server";
import type { ApartmentRecord, ApartmentRecordWithPhotos } from "./types";

export async function getApartments(
  userId: string
): Promise<ApartmentRecord[]> {
  const supabase = await createClient();

  // Lista solo usa id, apartment_number, location, created_at — no
  // hace falta traer notes/updated_at para esta vista.
  const { data, error } = await supabase
    .from("apartment_records")
    .select("id, apartment_number, location, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApartmentRecord[];
}

export async function getApartmentById(
  id: string,
  userId: string
): Promise<ApartmentRecordWithPhotos | null> {
  const supabase = await createClient();

  // Vista de detalle sí necesita todos los campos.
  const { data, error } = await supabase
    .from("apartment_records")
    .select("*, photos(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    photos: data.photos ?? [],
  };
}
