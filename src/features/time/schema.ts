import { z } from "zod";

import type { IsoDate } from "@/lib/dates";

import type { TimerMode, TimerState } from "./timer";

/** The timer as the client sees it, with the linked task's title for display. */
export type TimerSnapshot = TimerState & {
  task: { id: string; title: string } | null;
  /** Bumps on every server write, so stale server renders can be told apart. */
  version: number;
};

/** A stored entry, as needed to put it back (undo of a delete). */
export const entrySnapshot = z.object({
  id: z.uuid(),
  taskId: z.uuid().nullable(),
  source: z.enum(["pomodoro", "stopwatch", "manual"]),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }),
  seconds: z.number().int().min(1).max(86_400),
  note: z.string().max(500),
});
export type EntrySnapshot = z.infer<typeof entrySnapshot>;

export type TimerResult =
  | { ok: true; timer: TimerSnapshot; serverNow: number; logged: EntrySnapshot[] }
  | { ok: false; error: string };

export type EntryResult = { ok: true; entry: EntrySnapshot } | { ok: false; error: string };

export const timerCommandInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("finish") }),
  z.object({ type: z.literal("discard") }),
  z.object({ type: z.literal("advance") }),
  z.object({ type: z.literal("mode"), mode: z.enum(["pomodoro", "stopwatch"]) }),
  z.object({ type: z.literal("task"), taskId: z.uuid().nullable() }),
  z.object({ type: z.literal("note"), note: z.string().max(500) }),
]);

export const logTimeInput = z.object({
  taskId: z.uuid().nullable(),
  date: z.iso.date(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a start time."),
  minutes: z.number().int().min(1, "Log at least a minute.").max(1440, "That’s longer than a day."),
  note: z.string().trim().max(500),
});
export type LogTimeInput = z.input<typeof logTimeInput>;

export type TimeEntryItem = {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string | null;
  projectColor: string | null;
  source: TimerMode | "manual";
  note: string;
  seconds: number;
  /** The local day it started on, and local wall-clock times ("09:30"). */
  date: IsoDate;
  start: string;
  end: string;
  snapshot: EntrySnapshot;
};

export type TaskChoice = {
  id: string;
  title: string;
  projectName: string | null;
  projectColor: string | null;
};
