// features/work-sessions/utils.ts

export function formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
  
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  
  export function formatDurationFromMinutes(minutes: number): string {
    return formatDuration(minutes * 60);
  }
  
  export function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  
  export function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }