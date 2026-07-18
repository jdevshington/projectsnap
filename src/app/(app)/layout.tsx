// src/app/(app)/layout.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts ya bloquea requests no autenticados antes de llegar aquí.
  // Este check se mantiene como defensa en profundidad — el render de
  // RSC no debería depender solo del middleware — y ahora es
  // prácticamente gratis porque getUser() está cacheado por request y
  // la page de abajo reutiliza la misma llamada.
  const user = await getUser();
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
