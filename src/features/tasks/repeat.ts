import { z } from "zod";

import { addDays, makeDate, weekday, type IsoDate } from "@/lib/dates";

/**
 * How a task repeats (ADR 0007). Completing a recurring task moves it to its next
 * occurrence instead of closing it. `days` (0 = Sunday) pins weekly rules to weekdays;
 * `day` pins monthly and yearly rules to a day of the month (clamped to short months).
 */
export type RepeatRule = {
  freq: "day" | "week" | "month" | "year";
  every: number;
  days?: number[];
  day?: number;
};

/** Validates and normalizes (sorted unique weekdays; fields only where they apply). */
export const repeatRule = z
  .object({
    freq: z.enum(["day", "week", "month", "year"]),
    every: z.int().min(1).max(99),
    days: z.array(z.int().min(0).max(6)).min(1).max(7).optional(),
    day: z.int().min(1).max(31).optional(),
  })
  .transform((r): RepeatRule => {
    const rule: RepeatRule = { freq: r.freq, every: r.every };
    if (r.freq === "week" && r.days) rule.days = [...new Set(r.days)].sort((a, b) => a - b);
    if ((r.freq === "month" || r.freq === "year") && r.day) rule.day = r.day;
    return rule;
  });

const toUtc = (iso: IsoDate) => new Date(`${iso}T00:00:00Z`);

/** Same day-of-month `months` later, clamped (Jan 31 + 1 month → Feb 28/29). */
function addMonths(iso: IsoDate, months: number, day?: number): IsoDate {
  const d = toUtc(iso);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const want = day ?? d.getUTCDate();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return makeDate(year, month, Math.min(want, last))!;
}

/** The occurrence strictly after `from`, counting from `from` itself. */
function step(rule: RepeatRule, from: IsoDate): IsoDate {
  switch (rule.freq) {
    case "day":
      return addDays(from, rule.every);
    case "week": {
      if (!rule.days) return addDays(from, 7 * rule.every);
      const wd = weekday(from);
      const later = rule.days.find((d) => d > wd);
      if (later !== undefined) return addDays(from, later - wd);
      return addDays(from, 7 * rule.every - wd + rule.days[0]!);
    }
    case "month":
      return addMonths(from, rule.every, rule.day);
    case "year":
      return addMonths(from, 12 * rule.every, rule.day);
  }
}

/**
 * Where a recurring task goes when it's completed: the first occurrence after its
 * due date that is also after today, so finishing late never schedules into the past.
 */
export function nextOccurrence(rule: RepeatRule, due: IsoDate, today: IsoDate): IsoDate {
  let next = step(rule, due);
  for (let i = 0; next <= today && i < 5000; i++) next = step(rule, next);
  return next;
}

/** First date on or after `today` that fits the rule (for a task that had no date). */
export function firstOccurrence(rule: RepeatRule, today: IsoDate): IsoDate {
  if (rule.freq === "week" && rule.days) {
    const wd = weekday(today);
    const day = rule.days.find((d) => d >= wd);
    return day !== undefined ? addDays(today, day - wd) : addDays(today, 7 - wd + rule.days[0]!);
  }
  if (rule.freq === "month" && rule.day) {
    const thisMonth = addMonths(today, 0, rule.day);
    return thisMonth >= today ? thisMonth : addMonths(today, 1, rule.day);
  }
  return today;
}

/** Whether `date` is one of the rule's own days (so it can anchor the series). */
export function fitsRule(rule: RepeatRule, date: IsoDate): boolean {
  if (rule.freq === "week" && rule.days) return rule.days.includes(weekday(date));
  if (rule.freq === "month" && rule.day) return addMonths(date, 0, rule.day) === date;
  return true;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
};

const NAMED_DAYS: Record<string, string> = {
  "1,2,3,4,5": "weekdays",
  "0,6": "weekends",
  "0,1,2,3,4,5,6": "day",
};

/** "Daily", "Weekdays", "Mon, Thu", "Every 2 weeks", "Monthly on the 15th" … */
export function describeRepeat(rule: RepeatRule): string {
  const n = rule.every;
  switch (rule.freq) {
    case "day":
      return n === 1 ? "Daily" : `Every ${n} days`;
    case "week": {
      if (!rule.days) return n === 1 ? "Weekly" : `Every ${n} weeks`;
      const named = NAMED_DAYS[rule.days.join()];
      // Monday-first reads naturally: "Mon, Sun" rather than "Sun, Mon".
      const list =
        named ??
        (rule.days.length === 1
          ? WEEKDAY_LONG[rule.days[0]!]!
          : [...rule.days.filter((d) => d > 0), ...rule.days.filter((d) => d === 0)]
              .map((d) => WEEKDAY_SHORT[d])
              .join(", "));
      if (n === 1) {
        if (named === "day") return "Daily";
        if (named) return named[0]!.toUpperCase() + named.slice(1);
        return `Every ${list}`;
      }
      return `Every ${n} weeks on ${list}`;
    }
    case "month": {
      const on = rule.day ? ` on the ${ordinal(rule.day)}` : "";
      return n === 1 ? `Monthly${on}` : `Every ${n} months${on}`;
    }
    case "year":
      return n === 1 ? "Yearly" : `Every ${n} years`;
  }
}

/** The common rules, anchored to a date's weekday / day of month where it matters. */
export function repeatPresets(anchor: IsoDate): { key: string; rule: RepeatRule }[] {
  const d = toUtc(anchor);
  return [
    { key: "daily", rule: { freq: "day", every: 1 } },
    { key: "weekdays", rule: { freq: "week", every: 1, days: [1, 2, 3, 4, 5] } },
    { key: "weekly", rule: { freq: "week", every: 1, days: [weekday(anchor)] } },
    { key: "monthly", rule: { freq: "month", every: 1, day: d.getUTCDate() } },
    { key: "yearly", rule: { freq: "year", every: 1, day: d.getUTCDate() } },
  ];
}

export const sameRule = (a: RepeatRule | null, b: RepeatRule | null) =>
  JSON.stringify(a) === JSON.stringify(b);
