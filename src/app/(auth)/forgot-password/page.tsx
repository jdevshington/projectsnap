// app/(auth)/forgot-password/page.tsx este archivo
"use client"; 
  
import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
    const [state, action, pending] = useActionState(requestPasswordReset, null);

    if (state?.success) {
        return (
            <main className="mx-auto max-w-md px-6 pt-16 pb-6">
                <div className="mb-6">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="font-mono text-base font-semibold tracking-tight text-[#111110]">
                            ProjectSnap
                        </span>
                        <span className="font-bold text-[#E8FF57]">·</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#E2E2E0] bg-white p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F0EE]">
                        <span className="text-lg">✉️</span>
                    </div>
                    <h1 className="mb-2 text-xl font-semibold text-[#111110]">Check your email</h1>
                    <p className="text-sm text-[#6F6F6C] leading-relaxed">
                        If that email is registered, you will receive a reset link shortly.
                        Check your spam folder if you don&apos;t see it.
                    </p>
                </div>

                <p className="mt-6 text-center text-sm text-[#6F6F6C]">
                    <Link href="/login" className="font-medium text-[#111110] underline underline-offset-2">
                        Back to login
                    </Link>
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-md px-6 pt-16 pb-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-1 mb-1">
                    <span className="font-mono text-base font-semibold tracking-tight text-[#111110]">
                        ProjectSnap
                    </span>
                    <span className="font-bold text-[#E8FF57]">·</span>
                </div>
                <h1 className="text-2xl font-semibold text-[#111110]">Reset password</h1>
                <p className="mt-1 text-sm text-[#6F6F6C]">
                    Enter your email and we&apos;ll send you a link.
                </p>
            </div>

            {/* Form */}
            <form action={action} className="space-y-3" noValidate>
                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#E2E2E0] bg-white px-4 py-3 text-sm text-[#111110] placeholder:text-[#ADADAA] focus:border-[#111110] focus:outline-none transition-colors"
                    required
                />

                {state?.error && (
                    <p role="alert" className="text-sm text-red-500">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-xl bg-[#111110] py-3 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
                >
                    {pending ? "Sending…" : "Send reset link"}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#6F6F6C]">
                Remembered it?{" "}
                <Link href="/login" className="font-medium text-[#111110] underline underline-offset-2">
                    Back to login
                </Link>
            </p>
        </main>
    );
}
