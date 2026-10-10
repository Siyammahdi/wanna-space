import { generateKeyBetween } from "fractional-indexing";

import { addDays, type IsoDate } from "@/lib/dates";

import type { TaskItem } from "./schema";

/** The board's open-task sections, top to bottom. */
export const SECTIONS = ["overdue", "today", "upcoming", "someday"] as const;
export type SectionId = (typeof SECTIONS)[number];

type Placed = Pick<TaskItem, "id" | "dueDate" | "dueTime" | "sortKey" | "repeat">;

export function sectionOf(task: Pick<TaskItem, "dueDate">, today: IsoDate): SectionId {
  if (!task.dueDate) return "someday";
  if (task.dueDate < today) return "overdue";
  return task.dueDate === today ? "today" : "upcoming";
}

const byteOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const whenKey = (t: Pick<TaskItem, "dueDate" | "dueTime">) =>
  `${t.dueDate ?? "9999-12-31"} ${t.dueTime ?? "99:99"}`;

/** Board order: date, then time (timed first), then the user's own order. */
export const compareTasks = (a: Placed, b: Placed) =>
  byteOrder(whenKey(a), whenKey(b)) || byteOrder(a.sortKey, b.sortKey);

/** A key after every task the client knows about, so a new task lands at the bottom. */
export const lastKey = (tasks: Pick<TaskItem, "sortKey">[]) =>
  generateKeyBetween(
    tasks.reduce<string | null>((max, t) => (max && max >= t.sortKey ? max : t.sortKey), null),
    null,
  );

export type Placement = { dueDate: IsoDate | null; sortKey: string };

/**
 * Where `task` lands when dropped at `index` among `rows` (the target section in board
 * order, without `task`). Today and No date set the date; Upcoming takes the date of the
 * task it lands next to; Overdue keeps the task's own date (only overdue tasks go there).
 * Null when nothing would change or the drop isn't allowed (a repeating task needs a date).
 */
export function placeTask(
  task: Placed,
  rows: Placed[],
  index: number,
  section: SectionId,
  today: IsoDate,
): Placement | null {
  if (section === "overdue" && sectionOf(task, today) !== "overdue") return null;

  const dueDate =
    section === "today"
      ? today
      : section === "someday"
        ? null
        : section === "overdue"
          ? task.dueDate
          : (rows[index - 1]?.dueDate ?? rows[index]?.dueDate ?? addDays(today, 1));
  return placeAt(task, rows, index, dueDate);
}

/**
 * `task` due on `dueDate`, placed at `index` among `rows` (board order, without `task`).
 * Null when nothing would change or a repeating task would lose its date.
 */
export function placeAt(
  task: Placed,
  rows: Placed[],
  index: number,
  dueDate: IsoDate | null,
): Placement | null {
  if (!dueDate && task.repeat) return null;

  // Manual order only applies among tasks sharing a date and time; the rest sorts itself.
  const dueTime = dueDate ? task.dueTime : null;
  const peer = (t: Placed) => t.dueDate === dueDate && t.dueTime === dueTime;
  const above = rows.slice(0, index).findLast(peer);
  let below = rows.slice(index).find(peer);

  const inPlace =
    dueDate === task.dueDate &&
    (!above || above.sortKey < task.sortKey) &&
    (!below || task.sortKey < below.sortKey);
  if (inPlace) return null;

  if (above && below && above.sortKey >= below.sortKey) below = undefined;
  return { dueDate, sortKey: generateKeyBetween(above?.sortKey ?? null, below?.sortKey ?? null) };
}

/**
 * One keyboard step (Alt+↑/↓) up or down the board. At a section's edge the task crosses
 * into the next section; positions where it wouldn't actually move are skipped.
 */
export function stepTask(
  task: Placed,
  sections: Record<SectionId, Placed[]>,
  delta: -1 | 1,
  today: IsoDate,
): Placement | null {
  const from = SECTIONS.indexOf(sectionOf(task, today));
  const at = sections[SECTIONS[from]!].findIndex((t) => t.id === task.id);
  if (at === -1) return null;

  for (let s = from; s >= 0 && s < SECTIONS.length; s += delta) {
    const section = SECTIONS[s]!;
    const rows = sections[section].filter((t) => t.id !== task.id);
    // Within its own section the task starts one step away; elsewhere, at the near edge.
    let index = s === from ? at + delta : delta > 0 ? 0 : rows.length;
    for (; index >= 0 && index <= rows.length; index += delta) {
      const placement = placeTask(task, rows, index, section, today);
      if (placement) return placement;
    }
  }
  return null;
}
