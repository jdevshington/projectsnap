// features/work-sessions/components/use-elapsed.ts

"use client";

import { useEffect, useState } from "react";

/**
 * Returns the number of elapsed seconds since `startedAt`,
 * updated every second. Safe for SSR (starts at 0).
 */
export function useElapsed(startedAt: string): number {
  const [elapsed, setElapsed] = useState(() => {
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  });

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();

    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));

    tick(); // Sync immediately on mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}
