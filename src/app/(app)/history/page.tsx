// src/app/(app)/history/page.tsx

import { getUser } from "@/lib/supabase/server";
import { getCompletedSessions } from "@/features/work-sessions/queries";
import { SessionHistory } from "@/features/work-sessions/components/session-history";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { requirePaidAccess } from "@/features/billing/gating";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await requirePaidAccess();

  const [sessions, { t }] = await Promise.all([
    getCompletedSessions(user.id, 50),
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
