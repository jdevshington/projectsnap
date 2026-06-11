// features/work-sessions/queries.ts

import { createClient } from "@/lib/supabase/server";
import type { ActiveSession, CompletedSession } from "./types";

/**
 * Returns the user's current active session (ended_at IS NULL),
 * or null if none exists.
 */
export async function getActiveSession(
  userId: string
): Promise<ActiveSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ActiveSession | null;
}

/**
 * Returns the user's completed sessions, most recent first.
 */
export async function getCompletedSessions(
  userId: string,
  limit = 10
): Promise<CompletedSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as CompletedSession[];
}
