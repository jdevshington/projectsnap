// features/profile/components/name-prompt-modal.tsx
"use client";

import { useActionState, useState, useEffect } from "react";
import { updateFullName } from "../actions";

export function NamePromptModal() {
  const [dismissed, setDismissed] = useState(false);
  const [state, action, pending] = useActionState(updateFullName, null);

  const isVisible = !dismissed && !(state && "success" in state);

  useEffect(() => {
    if (!isVisible) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setDismissed(true)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E2E2E0] bg-white p-6 shadow-2xl">
        <h2
          id="name-prompt-title"
          className="mb-1 text-base font-semibold text-[#111110]"
        >
          What&apos;s your name?
        </h2>
        <p className="mb-5 text-sm text-[#6F6F6C] leading-relaxed">
          We&apos;ll use it to personalize your experience. You can always
          change it later in your profile.
        </p>

        <form action={action} className="space-y-3" noValidate>
          <input
            name="full_name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            autoFocus
            className="w-full rounded-xl border border-[#E2E2E0] bg-[#FAFAF9] px-4 py-3 text-sm text-[#111110] placeholder:text-[#ADADAA] focus:border-[#111110] focus:bg-white focus:outline-none transition-colors"
            required
          />

          {state && "error" in state && (
            <p role="alert" className="text-sm text-red-500">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#1A1A19] py-3 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-2 w-full rounded-xl py-2.5 text-sm text-[#ADADAA] transition hover:text-[#6F6F6C]"
        >
          Ask me later
        </button>
      </div>
    </div>
  );
}
