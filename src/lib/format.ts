// src/lib/format.ts

import type { Locale } from "./i18n/translations";

const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  es: "es-DO",
};

export function formatTime(isoString: string, locale: Locale = "en"): string {
  return new Date(isoString).toLocaleTimeString(INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDate(isoString: string, locale: Locale = "en"): string {
  return new Date(isoString).toLocaleDateString(INTL_LOCALE[locale], {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  isoString: string,
  locale: Locale = "en"
): string {
  return new Date(isoString).toLocaleDateString(INTL_LOCALE[locale], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDurationFromMinutes(minutes: number): string {
  return formatDuration(minutes * 60);
}
