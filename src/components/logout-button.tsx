// components/logout-button.tsx

"use client";

import { signOut } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/context";

export function LogoutButton() {
  const { t } = useI18n();

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded border border-[#E2E2E0] px-4 py-2 text-sm text-[#6F6F6C] transition hover:border-[#111110] hover:text-[#111110]"
      >
        {t("common.logout")}
      </button>
    </form>
  );
}
