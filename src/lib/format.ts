// src/lib/format.ts

export function formatTime(
  isoString: string,
  locale: string = "en-US"
): string {
  return new Date(isoString).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDate(
  isoString: string,
  locale: string = "en-US"
): string {
  return new Date(isoString).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  isoString: string,
  locale: string = "en-US"
): string {
  return new Date(isoString).toLocaleDateString(locale, {
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
