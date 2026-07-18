// src/features/auth/actions.ts

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  signUpSchema,
  signInSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "./schema";
import type { ActionState } from "@/lib/action-state";

export async function signUp(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Password reset ────────────────────────────────────────────
export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    // Se mantiene el mismo comportamiento de siempre-success por
    // seguridad (no revelar si el email es válido/existe), pero si
    // ni siquiera tiene forma de email no vale la pena pegarle a Supabase.
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    }
  );

  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}
