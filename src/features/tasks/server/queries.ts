import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";

import type { IsoDate } from "@/lib/dates";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, task, type Task } from "@/server/db/schema";
import { getUserTimeZone } from "@/server/today";

import type { Priority } from "../parse";
import { PROJECT_COLORS, type ProjectColor } from "../projects";
import { repeatRule } from "../repeat";
import type { ProjectItem, TaskItem, TaskScope } from "../schema";
import { toCover } from "./cover";

/** Fractional keys must compare byte-wise, not by locale. */
export const taskSortKey = sql`${task.sortKey} collate "C"`;
export const projectSortKey = sql`${project.sortKey} collate "C"`;

const toItem = (t: Task): TaskItem => ({
  id: t.id,
  title: t.title,
  notes: t.notes,
  dueDate: t.dueDate,
  dueTime: t.dueTime?.slice(0, 5) ?? null,
  repeat: t.repeat && t.dueDate ? (repeatRule.safeParse(t.repeat).data ?? null) : null,
  priority: t.priority as Priority,
  status: t.status,
  completedAt: t.completedAt?.toISOString() ?? null,
  projectId: t.projectId,
  stageId: t.stageId,
  parentId: t.parentId,
  sortKey: t.sortKey,
  cover: toCover(t.cover),
});

/** Parents followed by all of their subtasks (one query, in creation order). */
async function withSubtasks(spaceId: string, parents: Task[]): Promise<TaskItem[]> {
  if (parents.length === 0) return [];
  const children = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.spaceId, spaceId),
        inArray(
          task.parentId,
          parents.map((p) => p.id),
        ),
      ),
    )
    .orderBy(taskSortKey);
  return [...parents, ...children].map(toItem);
}

const toColor = (c: string): ProjectColor =>
  (PROJECT_COLORS as string[]).includes(c) ? (c as ProjectColor) : "fern";

function scopeFilter(scope: TaskScope): SQL | undefined {
  if (scope.kind === "inbox") return isNull(task.projectId);
  if (scope.kind === "project") return eq(task.projectId, scope.id);
  return undefined;
}

export async function listOpenTasks(scope: TaskScope = { kind: "all" }): Promise<TaskItem[]> {
  const { space } = await requireSpace();
  const rows = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        eq(task.status, "open"),
        isNull(task.parentId),
        scopeFilter(scope),
      ),
    )
    .orderBy(sql`${task.dueDate} asc nulls last`, sql`${task.dueTime} asc nulls last`, taskSortKey);
  return withSubtasks(space.id, rows);
}

export async function listRecentlyCompleted(
  scope: TaskScope = { kind: "all" },
  limit = 30,
): Promise<TaskItem[]> {
  const { space } = await requireSpace();
  const rows = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        eq(task.status, "done"),
        isNull(task.parentId),
        scopeFilter(scope),
      ),
    )
    .orderBy(desc(task.completedAt))
    .limit(limit);
  return withSubtasks(space.id, rows);
}

/**
 * Everything the Today room lists, top level with subtasks: open tasks due on or before
 * `today`, tasks completed today (in the user's time zone), and the day's picked tasks
 * whatever their date or status.
 */
export async function listTodayTasks(today: IsoDate, picked: string[] = []): Promise<TaskItem[]> {
  const [{ space }, tz] = await Promise.all([requireSpace(), getUserTimeZone()]);
  const rows = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        isNull(task.parentId),
        or(
          and(eq(task.status, "open"), isNotNull(task.dueDate), lte(task.dueDate, today)),
          and(
            eq(task.status, "done"),
            sql`(${task.completedAt} at time zone ${tz})::date = ${today}::date`,
          ),
          picked.length ? inArray(task.id, picked) : undefined,
        ),
      ),
    )
    .orderBy(taskSortKey)
    .limit(300);
  return withSubtasks(space.id, rows);
}

/** How many open top-level tasks are due on `date` (Today's peek at tomorrow). */
export async function countDueOn(date: IsoDate): Promise<number> {
  const { space } = await requireSpace();
  const [row] = await db
    .select({ n: count() })
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        eq(task.status, "open"),
        isNull(task.parentId),
        eq(task.dueDate, date),
      ),
    );
  return row?.n ?? 0;
}

/**
 * The Planner's week `from`–`to`: open tasks due in it, every unscheduled or overdue open
 * task (its tray), and the week's completed tasks — top level, with their subtasks.
 */
export async function listPlannerTasks(
  from: IsoDate,
  to: IsoDate,
  today: IsoDate,
): Promise<TaskItem[]> {
  const { space } = await requireSpace();
  const inWeek = and(gte(task.dueDate, from), lte(task.dueDate, to));
  const rows = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        isNull(task.parentId),
        or(
          and(eq(task.status, "open"), or(isNull(task.dueDate), lt(task.dueDate, today), inWeek)),
          and(eq(task.status, "done"), inWeek),
        ),
      ),
    )
    .orderBy(taskSortKey);
  return withSubtasks(space.id, rows);
}

/** Active projects with their open-task counts, in user order. Memoized per request. */
export const listProjects = cache(async (): Promise<ProjectItem[]> => {
  const { space } = await requireSpace();
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      keyword: project.keyword,
      color: project.color,
      openCount: sql<number>`count(${task.id})::int`,
    })
    .from(project)
    .leftJoin(
      task,
      and(eq(task.projectId, project.id), eq(task.status, "open"), isNull(task.parentId)),
    )
    .where(and(eq(project.spaceId, space.id), isNull(project.archivedAt)))
    .groupBy(project.id)
    .orderBy(projectSortKey);
  return rows.map((r) => ({ ...r, color: toColor(r.color) }));
});

/** Every open task (subtasks too, unless `topLevel`), soonest due first: for pickers in other rooms. */
export async function listTaskChoices({ limit = 300, topLevel = false } = {}) {
  const { space } = await requireSpace();
  return db
    .select({
      id: task.id,
      title: task.title,
      projectName: project.name,
      projectColor: project.color,
    })
    .from(task)
    .leftJoin(project, eq(project.id, task.projectId))
    .where(
      and(
        eq(task.spaceId, space.id),
        eq(task.status, "open"),
        topLevel ? isNull(task.parentId) : undefined,
      ),
    )
    .orderBy(sql`${task.dueDate} asc nulls last`, taskSortKey)
    .limit(limit);
}

export async function countInbox(): Promise<number> {
  const { space } = await requireSpace();
  const [row] = await db
    .select({ n: count() })
    .from(task)
    .where(
      and(
        eq(task.spaceId, space.id),
        eq(task.status, "open"),
        isNull(task.projectId),
        isNull(task.parentId),
      ),
    );
  return row?.n ?? 0;
}

export async function getProject(id: string): Promise<ProjectItem | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const projects = await listProjects();
  return projects.find((p) => p.id === id) ?? null;
}
