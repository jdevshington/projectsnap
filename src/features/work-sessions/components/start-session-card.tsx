// features/work-sessions/components/start-session-card.tsx

"use client";

import { useTransition } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSession } from "../actions";
import { useI18n } from "@/lib/i18n/context";

export function StartSessionCard() {
  const [isPending, startTransition] = useTransition();
  const { t } = useI18n();

  function handleStart() {
    startTransition(async () => {
      await startSession();
    });
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-5">
      <p className="mb-1 text-sm font-medium text-[#111110]">
        {t("session.workSession")}
      </p>
      <p className="mb-5 text-sm text-[#6F6F6C]">{t("session.startPrompt")}</p>

      <Button
        className="w-full gap-2 bg-[#1A1A19] text-white hover:bg-[#111110]"
        disabled={isPending}
        onClick={handleStart}
      >
        <Play size={14} strokeWidth={2} fill="currentColor" />
        {isPending ? t("session.starting") : t("session.startWork")}
      </Button>
    </div>
  );
}
