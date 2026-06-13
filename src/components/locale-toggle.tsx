// components/locale-toggle.tsx
"use client";

import { useI18n } from "@/lib/i18n/context";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      className="rounded-lg border border-[#E2E2E0] px-2.5 py-1.5 font-mono text-xs font-medium text-[#6F6F6C] transition hover:border-[#111110] hover:text-[#111110]"
      aria-label="Change language"
    >
      {locale === "en" ? "ES" : "EN"}
    </button>
  );
}
