"use server";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { page, project, task, timeEntry, vaultItem } from "@/server/db/schema";

export type SpaceStats = {
  projects: number;
  openTasks: number;
  doneTasks: number;
  pages: number;
  focusSeconds: number;
  vaultItems: number;
};

/** What's in the space, for Settings → Data. */
export async function getSpaceStats(): Promise<SpaceStats> {
  const { space } = await requireSpace();
  const [[projects], tasks, [pages], [time], [vault]] = await Promise.all([
    db
      .select({ n: count() })
      .from(project)
      .where(and(eq(project.spaceId, space.id), isNull(project.archivedAt))),
    db
      .select({ status: task.status, n: count() })
      .from(task)
      .where(eq(task.spaceId, space.id))
      .groupBy(task.status),
    db.select({ n: count() }).from(page).where(eq(page.spaceId, space.id)),
    db
      .select({ s: sql<number>`coalesce(sum(${timeEntry.seconds}), 0)::int` })
      .from(timeEntry)
      .where(eq(timeEntry.spaceId, space.id)),
    db
      .select({ n: count() })
      .from(vaultItem)
      .where(and(eq(vaultItem.spaceId, space.id), isNull(vaultItem.deletedAt))),
  ]);
  return {
    projects: projects?.n ?? 0,
    openTasks: tasks.find((t) => t.status === "open")?.n ?? 0,
    doneTasks: tasks.find((t) => t.status === "done")?.n ?? 0,
    pages: pages?.n ?? 0,
    focusSeconds: time?.s ?? 0,
    vaultItems: vault?.n ?? 0,
  };
}
