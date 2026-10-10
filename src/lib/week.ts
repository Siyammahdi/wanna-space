import { addDays, weekday, type IsoDate } from "@/lib/dates";
import type { WeekStart } from "@/lib/settings";

/** `weekStartsOn`: 0 = Sunday … 6 = Saturday (the user's "Week starts on" setting). */
export function startOfWeek(iso: IsoDate, weekStartsOn: WeekStart): IsoDate {
  return addDays(iso, -((weekday(iso) - weekStartsOn + 7) % 7));
}

export const weekDays = (start: IsoDate): IsoDate[] =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i));

/** `?week=` from the URL: any valid date selects the week that contains it. */
export function weekFromParam(
  param: string | string[] | undefined,
  today: IsoDate,
  weekStartsOn: WeekStart,
): IsoDate {
  const valid = typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param);
  const date = valid && !Number.isNaN(Date.parse(`${param}T00:00:00Z`)) ? param : today;
  return startOfWeek(date, weekStartsOn);
}

const utc = (iso: IsoDate) => new Date(`${iso}T00:00:00Z`);
const format = (iso: IsoDate, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(iso));

/** "Oct 10 – 16, 2026", "Oct 31 – Nov 6, 2026", "Dec 27, 2025 – Jan 2, 2026". */
export function weekLabel(start: IsoDate): string {
  const end = addDays(start, 6);
  const [sy, sm] = [start.slice(0, 4), start.slice(5, 7)];
  const [ey, em] = [end.slice(0, 4), end.slice(5, 7)];
  const endDay = Number(end.slice(8, 10));
  if (sy !== ey) {
    return `${format(start, { month: "short", day: "numeric", year: "numeric" })} – ${format(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  const head = format(start, { month: "short", day: "numeric" });
  const tail = sm === em ? `${endDay}` : format(end, { month: "short", day: "numeric" });
  return `${head} – ${tail}, ${ey}`;
}

export const dayName = (iso: IsoDate) => format(iso, { weekday: "short" });
export const dayNumber = (iso: IsoDate) => Number(iso.slice(8, 10));
export const longDay = (iso: IsoDate) =>
  format(iso, { weekday: "long", month: "long", day: "numeric" });
