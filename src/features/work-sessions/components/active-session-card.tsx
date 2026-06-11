// features/work-sessions/components/active-session-card.tsx

"use client";

import { useTransition } from "react";
import { Timer, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endSession } from "../actions";
import { useElapsed } from "./use-elapsed";
import { formatDuration, formatTime } from "../utils";
import type { ActiveSession } from "../types";

interface Props {
  session: ActiveSession;
}

export function ActiveSessionCard({ session }: Props) {
  const [isPending, startTransition] = useTransition();
  const elapsed = useElapsed(session.started_at);

  function handleEnd() {
    startTransition(async () => {
      await endSession(session.id);
    });
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-[#111110]">
          Session in progress
        </span>
      </div>

      {/* Timer */}
      <div className="mb-1 flex items-end gap-2">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-[#111110]">
          {formatDuration(elapsed)}
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-[#6F6F6C]">
        <Timer size={13} strokeWidth={1.75} />
        Started at {formatTime(session.started_at)}
      </p>

      {/* End button */}
      <Button
        variant="outline"
        className="mt-5 w-full gap-2 border-[#E2E2E0] text-[#111110] hover:bg-[#F4F4F2]"
        disabled={isPending}
        onClick={handleEnd}
      >
        <Square size={14} strokeWidth={2} />
        {isPending ? "Ending session…" : "End Work"}
      </Button>
    </div>
  );
}
