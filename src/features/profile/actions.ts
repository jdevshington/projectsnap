// src/features/profile/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateFullNameSchema } from "./schema";
import type { ActionState } from "@/lib/action-state";

export async function updateFullName(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = updateFullNameSchema.safeParse({
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
