// app/not-found.tsx

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      {/* Code */}
      <p className="font-mono text-8xl font-bold tracking-tighter text-[#111110]">
        404
      </p>

      {/* Message */}
      <p className="mt-4 text-base font-medium text-[#111110]">
        Page not found
      </p>
      <p className="mt-2 text-sm text-[#6F6F6C]">
        This page doesn&apos;t exist or was moved.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-[#111110] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          Go to dashboard
        </Link>
        <Link
          href="/login"
          className="text-sm text-[#6F6F6C] underline underline-offset-2 hover:text-[#111110] transition-colors"
        >
          Sign in instead
        </Link>
      </div>
    </main>
  );
}
