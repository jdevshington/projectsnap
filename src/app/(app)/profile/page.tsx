// src/app/(app)/profile/page.tsx

import { getUser } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { t } = await getT();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        {t("profile.title")}
      </h1>

      <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
        <div className="px-5 py-4">
          <p className="text-xs text-[#6F6F6C]">{t("profile.email")}</p>
          <p className="mt-0.5 text-sm font-medium text-[#111110]">
            {user.email}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-[#6F6F6C]">{t("profile.accountId")}</p>
          <p className="mt-0.5 font-mono text-xs text-[#6F6F6C] break-all">
            {user.id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
