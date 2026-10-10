import type { IsoDate } from "@/lib/dates";

import type { TimeEntryItem } from "./schema";

export const totalSeconds = (entries: TimeEntryItem[]) =>
  entries.reduce((sum, e) => sum + e.seconds, 0);

/** Minutes since local midnight. */
export const minuteOf = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Where an entry sits on its day's 24-hour strip (an entry past midnight stops at it). */
export function daySpan(entry: TimeEntryItem): { from: number; to: number } {
  const from = minuteOf(entry.start);
  const end = minuteOf(entry.end);
  const to = end > from ? end : Math.min(1440, from + Math.max(1, Math.round(entry.seconds / 60)));
  return { from, to };
}

export function secondsByDay(entries: TimeEntryItem[], days: IsoDate[]): number[] {
  const totals = new Map<IsoDate, number>();
  for (const e of entries) totals.set(e.date, (totals.get(e.date) ?? 0) + e.seconds);
  return days.map((d) => totals.get(d) ?? 0);
}

export type TaskTotal = {
  key: string;
  title: string | null;
  projectName: string | null;
  projectColor: string | null;
  seconds: number;
  sessions: number;
};

/** Time per task, largest first; entries with no task share one row. */
export function secondsByTask(entries: TimeEntryItem[]): TaskTotal[] {
  const totals = new Map<string, TaskTotal>();
  for (const e of entries) {
    const key = e.taskId ?? "none";
    const row = totals.get(key) ?? {
      key,
      title: e.taskTitle,
      projectName: e.projectName,
      projectColor: e.projectColor,
      seconds: 0,
      sessions: 0,
    };
    row.seconds += e.seconds;
    row.sessions += 1;
    totals.set(key, row);
  }
  return [...totals.values()].sort((a, b) => b.seconds - a.seconds);
}
