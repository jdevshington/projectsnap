// src/app/(app)/layout.tsx

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/lib/i18n/context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();

  return (
    <I18nProvider initialLocale={locale}>
      <div className="min-h-svh pb-20">{children}</div>
      <BottomNav />
    </I18nProvider>
  );
}