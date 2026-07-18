// src/features/work-sessions/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveSession } from "./queries";
import type { ActionState } from "@/lib/action-state";

// startSession/endSession no se usan con useActionState (no reciben
// prevState) — se llaman directo desde un useTransition en el
// cliente. Por eso su tipo de retorno excluye el caso `null` de
// ActionState: siempre devuelven { error } o { success: true }.
type SyncActionState = Exclude<ActionState, null>;

export async function startSession(): Promise<SyncActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Enforce one active session at a time
  const existing = await getActiveSession(user.id);
  if (existing) return { error: "You already have an active session." };

  const { error } = await supabase.from("work_sessions").insert({
    user_id: user.id,
    started_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function endSession(sessionId: string): Promise<SyncActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Fetch the session to calculate duration
  const { data: session, error: fetchError } = await supabase
    .from("work_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("user_id", user.id) // Ownership check
    .is("ended_at", null)
    .single();

  if (fetchError || !session) {
    return { error: "Session not found or already ended." };
  }

  const endedAt = new Date();
  const startedAt = new Date(session.started_at);
  const durationMinutes = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 1000 / 60
  );

  const { error } = await supabase
    .from("work_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}