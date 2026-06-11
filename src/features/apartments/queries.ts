// features/apartments/queries.ts

import { createClient } from "@/lib/supabase/server";
import type { ApartmentRecord } from "./types";

export async function getApartments(
  userId: string
): Promise<ApartmentRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("apartment_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getApartmentById(
  id: string,
  userId: string
): Promise<ApartmentRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("apartment_records")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
