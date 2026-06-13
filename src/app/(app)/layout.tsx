// app/(app)/layout.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale;

  return (
    <I18nProvider initialLocale={locale}>
      <div className="min-h-svh pb-20">{children}</div>
      <BottomNav />
    </I18nProvider>
  );
}
