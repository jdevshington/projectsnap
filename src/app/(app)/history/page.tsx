// app/(app)/history/page.tsx

import { createClient } from "@/lib/supabase/server";
import { getCompletedSessions } from "@/features/work-sessions/queries";
import { SessionHistory } from "@/features/work-sessions/components/session-history";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { t }] = await Promise.all([
    getCompletedSessions(user!.id, 50),
    getT(),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        {t("nav.history")}
      </h1>
      <SessionHistory sessions={sessions} />
    </main>
  );
}
