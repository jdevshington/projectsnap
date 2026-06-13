// features/work-sessions/components/session-history.tsx

"use client";

import { Clock } from "lucide-react";
import { formatDate, formatTime, formatDurationFromMinutes } from "../utils";
import { useI18n } from "@/lib/i18n/context";
import type { CompletedSession } from "../types";

interface Props {
  sessions: CompletedSession[];
}

export function SessionHistory({ sessions }: Props) {
  const { t } = useI18n();

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-8 text-center">
        <p className="text-sm text-[#6F6F6C]">{t("session.noCompleted")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <Clock
              size={15}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-[#ADADAA]"
            />
            <div>
              <p className="text-sm font-medium text-[#111110]">
                {formatDate(session.started_at)}
              </p>
              <p className="mt-0.5 text-xs text-[#6F6F6C]">
                {formatTime(session.started_at)} –{" "}
                {formatTime(session.ended_at)}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-medium tabular-nums text-[#111110]">
            {formatDurationFromMinutes(session.duration_minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}
