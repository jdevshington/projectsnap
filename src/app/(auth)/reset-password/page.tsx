// src/app/(auth)/reset-password/page.tsx

"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // ← cliente browser, no server
import { updatePassword } from "@/features/auth/actions";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, action, pending] = useActionState(updatePassword, null);
  const router = useRouter();

  useEffect(() => {
    // El token viene en el hash: #access_token=...&type=recovery
    // Supabase JS lo detecta automáticamente con onAuthStateChange
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Supabase ya intercambió el token por una sesión activa
        setStatus("ready");
      }
    });

    // Timeout: si en 5s no llega PASSWORD_RECOVERY, el link es inválido/expirado
    const timer = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "invalid" : s));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  // ── Loading ──
  if (status === "loading") {
    return (
      <main className="mx-auto max-w-md px-6 pt-16">
        <Header />
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E2E0] border-t-[#111110]" />
          <p className="text-sm text-[#6F6F6C]">Verifying link…</p>
        </div>
      </main>
    );
  }

  // ── Invalid / expired ──
  if (status === "invalid") {
    return (
      <main className="mx-auto max-w-md px-6 pt-16">
        <Header />
        <div className="mt-8 rounded-2xl border border-[#E2E2E0] bg-white p-6">
          <p className="mb-1 font-medium text-[#111110]">
            Link expired or invalid
          </p>
          <p className="text-sm text-[#6F6F6C] leading-relaxed">
            Password reset links expire after 1 hour. Request a new one below.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-[#6F6F6C]">
          <Link
            href="/forgot-password"
            className="font-medium text-[#111110] underline underline-offset-2"
          >
            Request a new link
          </Link>
        </p>
      </main>
    );
  }

  // ── Ready — show form ──
  return (
    <main className="mx-auto max-w-md px-6 pt-16 pb-6">
      <Header />

      <div className="mb-8 mt-2">
        <h1 className="text-2xl font-semibold text-[#111110]">New password</h1>
        <p className="mt-1 text-sm text-[#6F6F6C]">Choose something strong.</p>
      </div>

      <form action={action} className="space-y-3">
        {/* Password */}
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-xl border border-[#E2E2E0] bg-white px-4 py-3 pr-11 text-sm text-[#111110] placeholder:text-[#ADADAA] focus:border-[#111110] focus:outline-none transition-colors"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADADAA] hover:text-[#111110] transition-colors focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOff size={18} strokeWidth={1.75} />
            ) : (
              <Eye size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>

        {/* Confirm */}
        <div className="relative">
          <input
            name="confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-xl border border-[#E2E2E0] bg-white px-4 py-3 pr-11 text-sm text-[#111110] placeholder:text-[#ADADAA] focus:border-[#111110] focus:outline-none transition-colors"
            required
          />
          <button
            type="button"
            aria-label={showConfirm ? "Hide password" : "Show password"}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADADAA] hover:text-[#111110] transition-colors focus-visible:outline-none"
          >
            {showConfirm ? (
              <EyeOff size={18} strokeWidth={1.75} />
            ) : (
              <Eye size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>

        {state && "error" in state && (
          <p role="alert" className="text-sm text-red-500">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[#111110] py-3 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-6 flex items-center gap-1">
      <span className="font-mono text-base font-semibold tracking-tight text-[#111110]">
        ProjectSnap
      </span>
      <span className="font-bold text-[#E8FF57]">·</span>
    </div>
  );
}
