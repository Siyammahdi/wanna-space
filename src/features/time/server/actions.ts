"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { activeTimer, task, timeEntry, type TimeEntry } from "@/server/db/schema";
import { getSettings } from "@/server/settings";
import { getUserTimeZone } from "@/server/today";

import {
  entrySnapshot,
  logTimeInput,
  timerCommandInput,
  type EntryResult,
  type EntrySnapshot,
  type LogTimeInput,
  type TimerResult,
  type TimerSnapshot,
} from "../schema";
import { apply, type TimerCommand } from "../timer";
import { loadTimer, toSnapshot } from "./queries";

const invalid = (error = "That didn’t look right. Please try again.") => ({
  ok: false as const,
  error,
});

const toEntrySnapshot = (e: TimeEntry): EntrySnapshot => ({
  id: e.id,
  taskId: e.taskId,
  source: e.source,
  startedAt: e.startedAt.toISOString(),
  endedAt: e.endedAt.toISOString(),
  seconds: e.seconds,
  note: e.note,
});

async function taskTitle(spaceId: string, taskId: string | null) {
  if (!taskId) return null;
  const [row] = await db
    .select({ title: task.title })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.spaceId, spaceId)));
  return row?.title ?? null;
}

const date = (ms: number | null) => (ms === null ? null : new Date(ms));

/**
 * Every timer change goes through here: the stored timer is locked, caught up with the
 * clock (logging any sessions that finished meanwhile), changed, and saved.
 */
export async function timerCommand(input: TimerCommand): Promise<TimerResult> {
  const parsed = timerCommandInput.safeParse(input);
  if (!parsed.success) return invalid();
  const command = parsed.data;
  const [{ user, space }, settings] = await Promise.all([requireSpace(), getSettings()]);
  if (command.type === "task" && command.taskId) {
    if ((await taskTitle(space.id, command.taskId)) === null) {
      return invalid("That task no longer exists.");
    }
  }

  const { saved, entries, now } = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(activeTimer)
      .where(eq(activeTimer.userId, user.id))
      .for("update");
    const now = Date.now();
    const current = toSnapshot(row?.spaceId === space.id ? row : undefined, null);
    const { state, logged } = apply(current, command, settings, now);

    const entries = logged.length
      ? await tx
          .insert(timeEntry)
          .values(
            logged.map((l) => ({
              spaceId: space.id,
              userId: user.id,
              taskId: l.taskId,
              source: l.source,
              startedAt: new Date(l.startedAt),
              endedAt: new Date(l.endedAt),
              seconds: l.seconds,
              note: l.note,
            })),
          )
          .returning()
      : [];

    const values = {
      spaceId: space.id,
      mode: state.mode,
      phase: state.phase,
      taskId: state.taskId,
      note: state.note,
      runStartedAt: date(state.runStartedAt),
      elapsedMs: Math.round(state.elapsedMs),
      sessionStartedAt: date(state.sessionStartedAt),
      rounds: state.rounds,
      updatedAt: new Date(now),
    };
    const [saved] = await tx
      .insert(activeTimer)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: activeTimer.userId, set: values })
      .returning();
    return { saved: saved!, entries, now };
  });

  if (entries.length) refresh();
  return {
    ok: true,
    timer: toSnapshot(saved, await taskTitle(space.id, saved.taskId)),
    serverNow: now,
    logged: entries.map(toEntrySnapshot),
  };
}

/** Read-only: the stored timer, for a tab coming back to the foreground. */
export async function syncTimer(): Promise<{ timer: TimerSnapshot; serverNow: number }> {
  return loadTimer();
}

/** Adds time by hand: a start on a local day plus a duration. */
export async function logTime(input: LogTimeInput): Promise<EntryResult> {
  const parsed = logTimeInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { taskId, date: day, start, minutes, note } = parsed.data;
  const [{ user, space }, tz] = await Promise.all([requireSpace(), getUserTimeZone()]);
  if (taskId && (await taskTitle(space.id, taskId)) === null) {
    return invalid("That task no longer exists.");
  }
  const startedAt = sql<Date>`(${`${day} ${start}`}::timestamp at time zone ${tz})`;
  const [entry] = await db
    .insert(timeEntry)
    .values({
      spaceId: space.id,
      userId: user.id,
      taskId,
      source: "manual",
      startedAt,
      endedAt: sql<Date>`${startedAt} + make_interval(mins => ${minutes}::int)`,
      seconds: minutes * 60,
      note,
    })
    .returning();

  refresh();
  return { ok: true, entry: toEntrySnapshot(entry!) };
}

export async function deleteEntry(id: string): Promise<EntryResult> {
  if (!entrySnapshot.shape.id.safeParse(id).success) return invalid();
  const { space } = await requireSpace();
  const [entry] = await db
    .delete(timeEntry)
    .where(and(eq(timeEntry.id, id), eq(timeEntry.spaceId, space.id)))
    .returning();
  if (!entry) return invalid("That entry is already gone.");
  refresh();
  return { ok: true, entry: toEntrySnapshot(entry) };
}

/** Puts back deleted entries (undo); a task deleted meanwhile leaves them unattached. */
export async function restoreEntries(
  input: EntrySnapshot[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = entrySnapshot.array().max(20).safeParse(input);
  if (!parsed.success) return invalid();
  const { user, space } = await requireSpace();
  const rows = await Promise.all(
    parsed.data.map(async (e) => ({
      ...e,
      taskId: (await taskTitle(space.id, e.taskId)) === null ? null : e.taskId,
      startedAt: new Date(e.startedAt),
      endedAt: new Date(e.endedAt),
      spaceId: space.id,
      userId: user.id,
    })),
  );
  if (rows.length) await db.insert(timeEntry).values(rows).onConflictDoNothing();
  refresh();
  return { ok: true };
}

export async function deleteEntries(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = entrySnapshot.shape.id.array().max(20).safeParse(ids);
  if (!parsed.success) return invalid();
  const { space } = await requireSpace();
  if (parsed.data.length) {
    await db
      .delete(timeEntry)
      .where(and(inArray(timeEntry.id, parsed.data), eq(timeEntry.spaceId, space.id)));
  }
  refresh();
  return { ok: true };
}
