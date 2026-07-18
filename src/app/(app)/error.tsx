// src/app/(app)/error.tsx

"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-lg font-semibold text-[#111110]">
        Something went wrong
      </h1>
      <p className="mb-6 text-sm text-[#6F6F6C]">
        Try again, or head back to your dashboard.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-[#1A1A19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-[#E2E2E0] px-4 py-2 text-sm font-medium transition hover:bg-[#F9F9F8]"
        >
          Dashboard
        </a>
      </div>
    </main>
  );
}
