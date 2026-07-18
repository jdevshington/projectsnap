// src/lib/i18n/server.ts

import { cookies } from "next/headers";
import { translations, type Locale, type TranslationKey } from "./translations";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return (cookieStore.get("locale")?.value ?? "en") as Locale;
}

export async function getT() {
  const locale = await getLocale();
  return {
    t: (key: TranslationKey) => translations[locale][key],
    locale,
  };
}
