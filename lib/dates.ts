// Small date helpers that work purely on local calendar dates (no timezone surprises).

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000);
}

export function eventDateTime(date: string, time?: string): Date {
  const d = parseYmd(date);
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 0, 0); // all-day items count as due by end of day
  }
  return d;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function prettyDate(s: string, withDow = true): string {
  const d = parseYmd(s);
  return `${withDow ? DOW[d.getDay()] + ", " : ""}${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function prettyTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (h === 23 && m === 59) return "11:59 PM";
  if (h === 12 && m === 0) return "noon";
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export function countdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "past";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days >= 2) return `${days}d ${hours}h`;
  if (days === 1) return `1d ${hours}h`;
  if (hours >= 1) return `${hours}h ${m}m`;
  return `${m}m`;
}

/** Monday-based week start */
export function weekStart(s: string): string {
  const d = parseYmd(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return ymd(d);
}
