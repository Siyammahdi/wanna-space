import { generateKeyBetween } from "fractional-indexing";

import type { ProjectStatus, TaskItem } from "@/features/tasks";
import { daysBetween, describeDue, type IsoDate } from "@/lib/dates";

import type { StageItem } from "./schema";

/** The built-in last column. Not a stage row: moving a card here completes the task. */
export const DONE = "done";

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; text: string; soft: string; dot: string }
> = {
  planning: {
    label: "Planning",
    text: "text-ink-muted",
    soft: "bg-surface-sunken",
    dot: "bg-ink-faint",
  },
  active: { label: "In orbit", text: "text-accent-ink", soft: "bg-accent-soft", dot: "bg-accent" },
  paused: { label: "Paused", text: "text-warning", soft: "bg-warning-soft", dot: "bg-warning" },
  complete: { label: "Landed", text: "text-success", soft: "bg-success-soft", dot: "bg-success" },
};

export type Health = "on-track" | "at-risk" | "late";

export const HEALTH_META: Record<Health, { label: string; text: string }> = {
  "on-track": { label: "On track", text: "text-success" },
  "at-risk": { label: "At risk", text: "text-warning" },
  late: { label: "Past target", text: "text-warning" },
};

/** Only projects in flight have a health; anything with work left past its target is late. */
export function healthOf(
  p: {
    status: ProjectStatus;
    targetDate: IsoDate | null;
    open: number;
    done: number;
    overdue: number;
  },
  today: IsoDate,
): Health | null {
  if (p.status !== "active" || p.open === 0) return null;
  if (p.targetDate && p.targetDate < today) return "late";
  if (p.overdue > 0) return "at-risk";
  if (p.targetDate && daysBetween(today, p.targetDate) <= 7 && p.open > p.done) return "at-risk";
  return "on-track";
}

/** "Lands in 12 days", "Lands today", "3 days past target". */
export function describeTarget(target: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, target);
  if (diff === 0) return "Lands today";
  if (diff === 1) return "Lands tomorrow";
  if (diff > 1 && diff <= 60) return `Lands in ${diff} days`;
  if (diff > 60) return `Lands ${describeDue(target, today).label}`;
  return diff === -1 ? "1 day past target" : `${-diff} days past target`;
}

export const progressOf = (open: number, done: number) =>
  open + done === 0 ? 0 : done / (open + done);

const byteOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const bySortKey = (a: { sortKey: string }, b: { sortKey: string }) =>
  byteOrder(a.sortKey, b.sortKey);

/** An open task whose stage is gone (or never set) sits in the first stage. */
export function stageOf(task: Pick<TaskItem, "stageId">, stages: StageItem[]): string | undefined {
  return stages.some((s) => s.id === task.stageId) ? task.stageId! : stages[0]?.id;
}

export type Columns = Record<string, string[]>;

/** Card ids per column: stages in their own order, then Done (newest first). */
export function columnsOf(tasks: TaskItem[], stages: StageItem[]): Columns {
  const columns: Columns = { [DONE]: [] };
  for (const s of stages) columns[s.id] = [];
  for (const t of tasks.filter((t) => t.status === "open").sort(bySortKey)) {
    const stage = stageOf(t, stages);
    if (stage) columns[stage]!.push(t.id);
  }
  columns[DONE] = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => byteOrder(b.completedAt ?? "", a.completedAt ?? ""))
    .map((t) => t.id);
  return columns;
}

/**
 * A sort key that puts a card at `index` among `rows` (the column without the card).
 * Null when the card is already there.
 */
export function keyAt(
  task: Pick<TaskItem, "sortKey">,
  rows: Pick<TaskItem, "sortKey">[],
  index: number,
  sameColumn: boolean,
): string | null {
  const above = rows[index - 1]?.sortKey ?? null;
  let below: string | null = rows[index]?.sortKey ?? null;
  if (sameColumn && (!above || above < task.sortKey) && (!below || task.sortKey < below)) {
    return null;
  }
  if (above && below && above >= below) below = null;
  return generateKeyBetween(above, below);
}

/** A key between two stages, for a stage moved or added at `index` (without it). */
export function stageKeyAt(stages: StageItem[], index: number): string {
  const above = stages[index - 1]?.sortKey ?? null;
  let below: string | null = stages[index]?.sortKey ?? null;
  if (above && below && above >= below) below = null;
  return generateKeyBetween(above, below);
}
