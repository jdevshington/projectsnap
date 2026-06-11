"use client";

// app/login/page.tsx

import { signIn } from "@/features/auth/actions";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-3xl font-bold">Login</h1>

      <form action={action} className="space-y-4" noValidate>
        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded border p-3"
          required
        />

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded border p-3 pr-11"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOff size={18} strokeWidth={1.75} />
            ) : (
              <Eye size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-[#6F6F6C] underline underline-offset-2">
            Forgot your password?
          </Link>
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-500">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {pending ? "Logging in…" : "Login"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-black underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
