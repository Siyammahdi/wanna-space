/**
 * Calendar-day helpers. Due dates are "floating" ISO dates (YYYY-MM-DD) with no
 * time zone; "today" is resolved in the user's zone (see ADR 0006). Arithmetic
 * runs in UTC so DST shifts can never skip or repeat a day.
 */

export type IsoDate = string;

export const TIME_ZONE_COOKIE = "ws-tz";

/** Inlined in <head>: tells the server the browser's zone for "today". */
export const timeZoneScript = `(function(){try{document.cookie="${TIME_ZONE_COOKIE}="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+";path=/;max-age=31536000;samesite=lax"}catch(e){}})();`;

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayIn(timeZone?: string): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const toUtc = (iso: IsoDate) => new Date(`${iso}T00:00:00Z`);
const fromUtc = (d: Date): IsoDate => d.toISOString().slice(0, 10);

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(iso: IsoDate): number {
  return toUtc(iso).getUTCDay();
}

/** The next given weekday on or after `from`. */
export function nextWeekday(from: IsoDate, day: number, { includeToday = true } = {}): IsoDate {
  let diff = (day - weekday(from) + 7) % 7;
  if (diff === 0 && !includeToday) diff = 7;
  return addDays(from, diff);
}

export function makeDate(year: number, month: number, day: number): IsoDate | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return fromUtc(d);
}

/**
 * "14:00" → "2pm" / "14:00", "09:30" → "9:30am" / "09:30".
 * Locale-independent so server and client agree.
 */
export function formatTime(time: string, format: "12h" | "24h" = "12h"): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  if (format === "24h") return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export function describeDue(iso: IsoDate, today: IsoDate): { label: string; tone: DueTone } {
  const diff = daysBetween(today, iso);
  const d = toUtc(iso);
  const sameYear = d.getUTCFullYear() === toUtc(today).getUTCFullYear();
  const short = d.toLocaleDateString("en", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });

  if (diff < 0) return { label: diff === -1 ? "Yesterday" : short, tone: "overdue" };
  if (diff === 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  if (diff < 7) {
    return {
      label: d.toLocaleDateString("en", { timeZone: "UTC", weekday: "long" }),
      tone: "soon",
    };
  }
  return { label: short, tone: "later" };
}
