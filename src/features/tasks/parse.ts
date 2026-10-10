import { addDays, makeDate, nextWeekday, type IsoDate } from "@/lib/dates";

import { firstOccurrence, type RepeatRule } from "./repeat";

export type Priority = 0 | 1 | 2 | 3;

export type ParsedTask = {
  title: string;
  dueDate: IsoDate | null;
  /** "HH:MM" when a time was written ("5pm", "17:00"). */
  dueTime: string | null;
  /** "every mon", "daily", "every 2 weeks" … (the date defaults to the first occurrence). */
  repeat: RepeatRule | null;
  priority: Priority;
  projectId: string | null;
  /** The exact substrings that were understood, for highlighting. */
  matches: { text: string; kind: "date" | "repeat" | "priority" | "project" }[];
};

type ProjectRef = { id: string; name: string; keyword?: string };

const PROJECT_RE = /(^|\s)#([\p{L}\p{M}\p{N}_-]+)/u;
const WORD_RE = /(^|\s)([\p{L}\p{M}\p{N}]+)(?=\s|$)/gu;
const normalize = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");

function findProject(token: string, projects: ProjectRef[]) {
  const key = normalize(token);
  if (!key) return undefined;
  return (
    projects.find((p) => p.keyword === key) ??
    projects.find((p) => normalize(p.name) === key) ??
    projects.find((p) => normalize(p.name).startsWith(key))
  );
}

/** The last word that is a project's keyword ("Fix the header twp"). */
function findKeyword(text: string, projects: ProjectRef[]) {
  if (!projects.some((p) => p.keyword)) return null;
  let found: { index: number; length: number; lead: string; word: string; id: string } | null =
    null;
  WORD_RE.lastIndex = 0;
  for (let m = WORD_RE.exec(text); m; m = WORD_RE.exec(text)) {
    const word = m[2]!.toLocaleLowerCase();
    const project = projects.find((p) => p.keyword === word);
    if (project) {
      found = { index: m.index, length: m[0].length, lead: m[1]!, word: m[2]!, id: project.id };
    }
  }
  return found;
}

const WEEKDAYS = new Map<string, number>([
  ["sun", 0],
  ["sunday", 0],
  ["mon", 1],
  ["monday", 1],
  ["tue", 2],
  ["tues", 2],
  ["tuesday", 2],
  ["wed", 3],
  ["weds", 3],
  ["wednesday", 3],
  ["thu", 4],
  ["thur", 4],
  ["thurs", 4],
  ["thursday", 4],
  ["fri", 5],
  ["friday", 5],
  ["sat", 6],
  ["saturday", 6],
]);
const WEEKDAY_SRC = [...WEEKDAYS.keys()].sort((a, b) => b.length - a.length).join("|");

/** Bare "sat"/"sun" are also everyday words ("sun cream"), so they need context. */
const AMBIGUOUS_WEEKDAYS = new Set(["sat", "sun"]);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_SRC = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";

type Rule = { re: RegExp; resolve: (m: RegExpExecArray, today: IsoDate) => IsoDate | null };

// Compiled once with the global flag; parseTaskInput resets lastIndex before each scan.
const DATE_RULES: Rule[] = [
  { re: /\b(today|tod)\b/gi, resolve: (_, t) => t },
  { re: /\b(tomorrow|tmrw?)\b/gi, resolve: (_, t) => addDays(t, 1) },
  { re: /\b(?:(?:this|next) )?weekend\b/gi, resolve: (_, t) => nextWeekday(t, 6) },
  { re: /\bnext week\b/gi, resolve: (_, t) => nextWeekday(t, 1, { includeToday: false }) },
  { re: /\bnext month\b/gi, resolve: (_, t) => addDays(t, 30) },
  {
    re: /\bin (\d{1,3}) ?(days?|d|weeks?|w)\b/gi,
    resolve: (m, t) => {
      const n = Number(m[1]);
      return addDays(t, m[2]!.toLowerCase().startsWith("w") ? n * 7 : n);
    },
  },
  {
    // "fri", "on fri", "this fri", and "next fri" all mean the coming Friday, never today.
    re: new RegExp(`\\b(?:(on|this|next) )?(${WEEKDAY_SRC})\\b`, "gi"),
    resolve: (m, t) => {
      const word = m[2]!.toLowerCase();
      const trailing = m.input.slice(m.index + m[0].length).trim() === "";
      if (!m[1] && !trailing && AMBIGUOUS_WEEKDAYS.has(word)) return null;
      return nextWeekday(t, WEEKDAYS.get(word)!, { includeToday: false });
    },
  },
  {
    re: new RegExp(`\\b(?:on )?${MONTH_SRC} (\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi"),
    resolve: (m, t) => monthDay(t, m[1]!, Number(m[2])),
  },
  {
    re: new RegExp(`\\b(?:on )?(\\d{1,2})(?:st|nd|rd|th)? ${MONTH_SRC}(?=\\s|$)`, "gi"),
    resolve: (m, t) => monthDay(t, m[2]!, Number(m[1])),
  },
];

/** Upcoming occurrence of a month/day: this year, or next year if it already passed. */
function monthDay(today: IsoDate, monthWord: string, day: number): IsoDate | null {
  const month = MONTHS.indexOf(monthWord.slice(0, 3).toLowerCase()) + 1;
  if (!month) return null;
  const year = Number(today.slice(0, 4));
  const candidate = makeDate(year, month, day);
  if (!candidate) return null;
  return candidate < today ? makeDate(year + 1, month, day) : candidate;
}

const UNITS: Record<string, RepeatRule["freq"]> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};
const ADVERBS: Record<string, RepeatRule["freq"]> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
  annually: "year",
};

const weekdayList = (text: string) =>
  [...text.toLowerCase().matchAll(new RegExp(`\\b(${WEEKDAY_SRC})\\b`, "g"))].map((m) =>
    WEEKDAYS.get(m[1]!)!,
  );

// Most specific first; the first rule that matches wins.
const REPEAT_RULES: { re: RegExp; resolve: (m: RegExpExecArray) => RepeatRule | null }[] = [
  {
    re: /\b(?:every month|monthly) on the (\d{1,2})(?:st|nd|rd|th)?\b/i,
    resolve: (m) => {
      const day = Number(m[1]);
      return day >= 1 && day <= 31 ? { freq: "month", every: 1, day } : null;
    },
  },
  {
    re: new RegExp(`\\bevery (${WEEKDAY_SRC})(?:(?:,? and |, ?| ?& ?)(${WEEKDAY_SRC}))*\\b`, "i"),
    resolve: (m) => ({ freq: "week", every: 1, days: weekdayList(m[0]) }),
  },
  {
    re: /\bevery (\d{1,2}) (day|week|month|year)s?\b/i,
    resolve: (m) => {
      const every = Number(m[1]);
      return every >= 1 ? { freq: UNITS[m[2]!.toLowerCase()]!, every } : null;
    },
  },
  {
    re: /\b(?:every (?:weekday|work ?day)|weekdays)\b/i,
    resolve: () => ({ freq: "week", every: 1, days: [1, 2, 3, 4, 5] }),
  },
  {
    re: /\bevery weekend\b/i,
    resolve: () => ({ freq: "week", every: 1, days: [0, 6] }),
  },
  {
    re: /\bevery (day|week|month|year)\b/i,
    resolve: (m) => ({ freq: UNITS[m[1]!.toLowerCase()]!, every: 1 }),
  },
  {
    // "weekly review" is a title, "review weekly" is a schedule: adverbs only count at the end.
    re: /\b(daily|weekly|monthly|yearly|annually)\s*$/i,
    resolve: (m) => ({ freq: ADVERBS[m[1]!.toLowerCase()]!, every: 1 }),
  },
];

/** A repeat rule typed on its own ("every 2 weeks", "every mon and thu", "monthly"). */
export function parseRepeat(text: string): RepeatRule | null {
  const input = text.trim();
  for (const { re, resolve } of REPEAT_RULES) {
    const m = re.exec(input);
    if (m) return resolve(m);
  }
  return null;
}

const PRIORITY_RE = /(^|\s)p([1-3])(?=\s|$)/i;

// "5pm", "at 9:30am", "17:00". A bare "at 5" is too ambiguous to guess.
const TIME_RULES: { re: RegExp; resolve: (m: RegExpExecArray) => string | null }[] = [
  {
    re: /\b(?:at )?(1[0-2]|0?[1-9])(?::([0-5]\d))? ?(am|pm)\b/i,
    resolve: (m) => {
      const h = (Number(m[1]) % 12) + (m[3]!.toLowerCase() === "pm" ? 12 : 0);
      return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
    },
  },
  {
    re: /\b(?:at )?([01]?\d|2[0-3]):([0-5]\d)\b/,
    resolve: (m) => `${m[1]!.padStart(2, "0")}:${m[2]}`,
  },
];

export function parseTaskInput(
  input: string,
  today: IsoDate,
  projects: ProjectRef[] = [],
): ParsedTask {
  let rest = input;
  const matches: ParsedTask["matches"] = [];
  let dueDate: IsoDate | null = null;
  let priority: Priority = 0;
  let projectId: string | null = null;

  const h = PROJECT_RE.exec(rest);
  const project = h && findProject(h[2]!, projects);
  if (h && project) {
    projectId = project.id;
    matches.push({ text: h[0].trim(), kind: "project" });
    rest = rest.slice(0, h.index) + h[1] + rest.slice(h.index + h[0].length);
  }

  const p = PRIORITY_RE.exec(rest);
  if (p) {
    priority = Number(p[2]) as Priority;
    matches.push({ text: p[0].trim(), kind: "priority" });
    rest = rest.slice(0, p.index) + p[1] + rest.slice(p.index + p[0].length);
  }

  let dueTime: string | null = null;
  for (const { re, resolve } of TIME_RULES) {
    const t = re.exec(rest);
    if (!t) continue;
    dueTime = resolve(t);
    matches.push({ text: t[0], kind: "date" });
    rest = rest.slice(0, t.index) + rest.slice(t.index + t[0].length);
    break;
  }

  // Before dates, so "every mon" isn't read as next Monday.
  let repeat: RepeatRule | null = null;
  for (const { re, resolve } of REPEAT_RULES) {
    const r = re.exec(rest.trimEnd());
    const rule = r && resolve(r);
    if (!r || !rule) continue;
    repeat = rule;
    matches.push({ text: r[0].trim(), kind: "repeat" });
    rest = rest.slice(0, r.index) + rest.slice(r.index + r[0].length);
    break;
  }

  // Dates usually trail the title, so prefer the match that ends last, then the longest.
  let best: { start: number; end: number; text: string; date: IsoDate } | null = null;
  for (const { re, resolve } of DATE_RULES) {
    re.lastIndex = 0;
    for (let m = re.exec(rest); m; m = re.exec(rest)) {
      const date = resolve(m, today);
      if (!date) continue;
      const candidate = { start: m.index, end: m.index + m[0].length, text: m[0], date };
      if (
        !best ||
        candidate.end > best.end ||
        (candidate.end === best.end && candidate.start < best.start)
      ) {
        best = candidate;
      }
    }
  }
  if (best) {
    dueDate = best.date;
    matches.push({ text: best.text, kind: "date" });
    rest = rest.slice(0, best.start) + rest.slice(best.end);
  }

  if (repeat) {
    dueDate ??= firstOccurrence(repeat, today);
    // Pin to the starting day so short months don't drift the series.
    if ((repeat.freq === "month" || repeat.freq === "year") && !repeat.day) {
      repeat.day = Number(dueDate.slice(8, 10));
    }
  }
  // A time on its own means today.
  if (dueTime && !dueDate) dueDate = today;

  // Last, so dates and priorities keep their words; a lone keyword stays the title.
  const k = projectId ? null : findKeyword(rest, projects);
  if (k && rest.trim().toLocaleLowerCase() !== k.word.toLocaleLowerCase()) {
    projectId = k.id;
    matches.push({ text: k.word, kind: "project" });
    rest = rest.slice(0, k.index) + k.lead + rest.slice(k.index + k.length);
  }

  const title = rest.replace(/\s+/g, " ").trim();
  return { title: title || input.trim(), dueDate, dueTime, repeat, priority, projectId, matches };
}
