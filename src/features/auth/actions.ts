// features/auth/actions.ts

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ── Shared types ──────────────────────────────────────────────
type BasicState = { error: string } | null

type AuthActionState = {
  error: string | null
  success: boolean
} | null

// ── Existing actions ──────────────────────────────────────────
export async function signUp(
  _prevState: BasicState,
  formData: FormData
): Promise<BasicState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signIn(
  _prevState: BasicState,
  formData: FormData
): Promise<BasicState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

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
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
  }

  return { error: null, success: true };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (password !== confirm) {
    return { error: "Passwords do not match.", success: false };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message, success: false };

  redirect("/dashboard");
}