import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { cache } from "react";

import { addDays, type IsoDate } from "@/lib/dates";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { activeTimer, project, task, timeEntry, type ActiveTimer } from "@/server/db/schema";
import { getUserTimeZone } from "@/server/today";

import type { TimeEntryItem, TimerSnapshot } from "../schema";
import { IDLE } from "../timer";

export function toSnapshot(
  row: ActiveTimer | undefined,
  taskTitle: string | null | undefined,
): TimerSnapshot {
  if (!row) return { ...IDLE, task: null, version: 0 };
  return {
    mode: row.mode,
    phase: row.phase,
    taskId: row.taskId,
    note: row.note,
    runStartedAt: row.runStartedAt?.getTime() ?? null,
    elapsedMs: row.elapsedMs,
    sessionStartedAt: row.sessionStartedAt?.getTime() ?? null,
    rounds: row.rounds,
    task: row.taskId && taskTitle != null ? { id: row.taskId, title: taskTitle } : null,
    version: row.updatedAt.getTime(),
  };
}

/** The signed-in user's timer (idle until first used). Memoized per request. */
export const getTimer = cache(async (): Promise<TimerSnapshot> => {
  const { user, space } = await requireSpace();
  const [row] = await db
    .select({ timer: activeTimer, title: task.title })
    .from(activeTimer)
    .leftJoin(task, eq(task.id, activeTimer.taskId))
    .where(and(eq(activeTimer.userId, user.id), eq(activeTimer.spaceId, space.id)));
  return toSnapshot(row?.timer, row?.title);
});

/** The timer plus the server's clock reading, so the client renders the same time. */
export async function loadTimer(): Promise<{ timer: TimerSnapshot; serverNow: number }> {
  const timer = await getTimer();
  return { timer, serverNow: Date.now() };
}

/** Entries that started on the local days `from`–`to` (inclusive), newest first. */
export async function listEntries(from: IsoDate, to: IsoDate): Promise<TimeEntryItem[]> {
  const [{ space }, tz] = await Promise.all([requireSpace(), getUserTimeZone()]);
  const local = (column: AnyPgColumn, format: string) =>
    sql<string>`to_char(${column} at time zone ${tz}, ${format})`;
  const rows = await db
    .select({
      entry: timeEntry,
      taskTitle: task.title,
      projectName: project.name,
      projectColor: project.color,
      date: local(timeEntry.startedAt, "YYYY-MM-DD"),
      start: local(timeEntry.startedAt, "HH24:MI"),
      end: local(timeEntry.endedAt, "HH24:MI"),
    })
    .from(timeEntry)
    .leftJoin(task, eq(task.id, timeEntry.taskId))
    .leftJoin(project, eq(project.id, task.projectId))
    .where(
      and(
        eq(timeEntry.spaceId, space.id),
        sql`${timeEntry.startedAt} >= (${from}::timestamp at time zone ${tz})`,
        sql`${timeEntry.startedAt} < (${addDays(to, 1)}::timestamp at time zone ${tz})`,
      ),
    )
    .orderBy(desc(timeEntry.startedAt))
    .limit(2000);

  return rows.map(({ entry, ...r }) => ({
    id: entry.id,
    taskId: entry.taskId,
    taskTitle: r.taskTitle,
    projectName: r.projectName,
    projectColor: r.projectColor,
    source: entry.source,
    note: entry.note,
    seconds: entry.seconds,
    date: r.date,
    start: r.start,
    end: r.end,
    snapshot: {
      id: entry.id,
      taskId: entry.taskId,
      source: entry.source,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt.toISOString(),
      seconds: entry.seconds,
      note: entry.note,
    },
  }));
}
