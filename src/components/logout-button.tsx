"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/context";
import { LogOut } from "lucide-react";

function LogoutButtonInner() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-1.5 rounded border px-4 py-2 text-sm transition ${
        pending
          ? "border-[#E2E2E0] bg-[#F4F4F2] text-[#ADADAA] cursor-not-allowed"
          : "border-[#E2E2E0] text-[#6F6F6C] hover:border-[#111110] hover:text-[#111110]"
      }`}
    >
      <LogOut size={14} strokeWidth={1.75} />
      {t("common.logout")}
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOut}>
      <LogoutButtonInner />
    </form>
  );
}
