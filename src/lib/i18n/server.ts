// lib/i18n/server.ts

import { cookies } from "next/headers";
import { translations, type Locale, type TranslationKey } from "./translations";

export async function getT() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale;
  return {
    t: (key: TranslationKey) => translations[locale][key],
    locale,
  };
}
