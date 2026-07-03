export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

/** Compact form for KPI cards: ₱9.3M, ₱848K — full precision in tooltips. */
export function formatPesoCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `₱${millions.toFixed(millions >= 100 ? 0 : 1)}M`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `₱${Math.round(amount / 1000)}K`;
  }
  return formatPeso(amount);
}

const MANILA_TZ = "Asia/Manila";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today's date as 'YYYY-MM-DD' in Asia/Manila. */
export function todayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: MANILA_TZ });
}

/** Converts an ISO timestamp to its 'YYYY-MM-DD' date in Asia/Manila. */
export function manilaDateString(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: MANILA_TZ });
}

/** Formats a date-only string ('YYYY-MM-DD') as e.g. 'Jul 5'. */
export function formatDateOnly(date: string): string {
  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
