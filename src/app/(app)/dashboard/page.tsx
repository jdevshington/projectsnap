// app/(app)/dashboard/page.tsx

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import {
  getActiveSession,
  getCompletedSessions,
} from "@/features/work-sessions/queries";
import { ActiveSessionCard } from "@/features/work-sessions/components/active-session-card";
import { StartSessionCard } from "@/features/work-sessions/components/start-session-card";
import { SessionHistory } from "@/features/work-sessions/components/session-history";

export const metadata = {
  title: "Home",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed by (app)/layout.tsx — safe to assert
  const [activeSession, completedSessions] = await Promise.all([
    getActiveSession(user!.id),
    getCompletedSessions(user!.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-base font-semibold tracking-tight text-[#111110]">
              ProjectSnap
            </span>
            <span className="font-bold text-[#E8FF57]">·</span>
          </div>
          <p className="mt-0.5 text-sm text-[#6F6F6C]">{user!.email}</p>
        </div>
        <LogoutButton />
      </div>

      {/* Session control */}
      <section className="mb-6">
        {activeSession ? (
          <ActiveSessionCard session={activeSession} />
        ) : (
          <StartSessionCard />
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[#6F6F6C]">
          Recent sessions
        </h2>
        <SessionHistory sessions={completedSessions} />
      </section>
    </main>
  );
}
