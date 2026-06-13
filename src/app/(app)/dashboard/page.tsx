// app/(app)/dashboard/page.tsx

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import {
  getActiveSession,
  getCompletedSessions,
} from "@/features/work-sessions/queries";
import { getProfile } from "@/features/profile/queries";
import { ActiveSessionCard } from "@/features/work-sessions/components/active-session-card";
import { StartSessionCard } from "@/features/work-sessions/components/start-session-card";
import { SessionHistory } from "@/features/work-sessions/components/session-history";
import { NamePromptModal } from "@/features/profile/components/name-prompt-modal";
import { LocaleToggle } from "@/components/locale-toggle";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [activeSession, completedSessions, profile, { t }] = await Promise.all([
    getActiveSession(user!.id),
    getCompletedSessions(user!.id),
    getProfile(user!.id),
    getT(),
  ]);

  const needsName = !profile?.full_name?.trim();
  const fullName = profile?.full_name?.trim() || user!.email!;
  const displayName = fullName.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      {needsName && <NamePromptModal />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-base font-semibold tracking-tight text-[#111110]">
              ProjectSnap
            </span>
            <span className="font-bold text-[#E8FF57]">·</span>
          </div>
          <p className="mt-0.5 text-sm text-[#6F6F6C]">
            {t("dashboard.hi")}, {displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <LogoutButton />
        </div>
      </div>

      <section className="mb-6">
        {activeSession ? (
          <ActiveSessionCard session={activeSession} />
        ) : (
          <StartSessionCard />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[#6F6F6C]">
          {t("dashboard.recentSessions")}
        </h2>
        <SessionHistory sessions={completedSessions} />
      </section>
    </main>
  );
}
