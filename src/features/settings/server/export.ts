import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import {
  page,
  project,
  projectStage,
  task,
  timeEntry,
  vaultCollection,
  vaultItem,
} from "@/server/db/schema";
import { getSettings } from "@/server/settings";

/** Everything in the user's space, as plain JSON they can keep or take elsewhere. */
export async function buildExport() {
  const { user, space } = await requireSpace();
  const [settings, projects, stages, tasks, pages, timeEntries, vaultCollections, vaultItems] =
    await Promise.all([
      getSettings(),
      db
        .select({
          id: project.id,
          name: project.name,
          keyword: project.keyword,
          color: project.color,
          icon: project.icon,
          description: project.description,
          status: project.status,
          targetDate: project.targetDate,
          archivedAt: project.archivedAt,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })
        .from(project)
        .where(eq(project.spaceId, space.id))
        .orderBy(asc(project.createdAt)),
      db
        .select({
          id: projectStage.id,
          projectId: projectStage.projectId,
          name: projectStage.name,
          wipLimit: projectStage.wipLimit,
        })
        .from(projectStage)
        .where(eq(projectStage.spaceId, space.id))
        .orderBy(asc(projectStage.projectId), sql`${projectStage.sortKey} collate "C"`),
      db
        .select({
          id: task.id,
          projectId: task.projectId,
          stageId: task.stageId,
          parentId: task.parentId,
          title: task.title,
          notes: task.notes,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          repeat: task.repeat,
          completedAt: task.completedAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })
        .from(task)
        .where(eq(task.spaceId, space.id))
        .orderBy(asc(task.createdAt)),
      db
        .select({
          id: page.id,
          parentId: page.parentId,
          title: page.title,
          icon: page.icon,
          content: page.content,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        })
        .from(page)
        .where(eq(page.spaceId, space.id))
        .orderBy(asc(page.createdAt)),
      db
        .select({
          id: timeEntry.id,
          taskId: timeEntry.taskId,
          source: timeEntry.source,
          startedAt: timeEntry.startedAt,
          endedAt: timeEntry.endedAt,
          seconds: timeEntry.seconds,
          note: timeEntry.note,
          createdAt: timeEntry.createdAt,
        })
        .from(timeEntry)
        .where(eq(timeEntry.spaceId, space.id))
        .orderBy(asc(timeEntry.startedAt)),
      db
        .select({
          id: vaultCollection.id,
          name: vaultCollection.name,
          createdAt: vaultCollection.createdAt,
        })
        .from(vaultCollection)
        .where(eq(vaultCollection.spaceId, space.id))
        .orderBy(sql`${vaultCollection.sortKey} collate "C"`),
      // Uploaded files stay in storage (download them from the Vault); this lists them.
      db
        .select({
          id: vaultItem.id,
          collectionId: vaultItem.collectionId,
          kind: vaultItem.kind,
          title: vaultItem.title,
          body: vaultItem.body,
          url: vaultItem.url,
          siteName: vaultItem.siteName,
          language: vaultItem.language,
          tags: vaultItem.tags,
          colors: vaultItem.colors,
          file: sql<{
            name: string;
            bytes: number;
          } | null>`case when ${vaultItem.kind} in ('image', 'file') and ${vaultItem.asset} is not null then jsonb_build_object('name', ${vaultItem.asset} ->> 'filename', 'bytes', (${vaultItem.asset} ->> 'bytes')::int) end`,
          createdAt: vaultItem.createdAt,
          updatedAt: vaultItem.updatedAt,
        })
        .from(vaultItem)
        .where(and(eq(vaultItem.spaceId, space.id), isNull(vaultItem.deletedAt)))
        .orderBy(asc(vaultItem.createdAt)),
    ]);

  return {
    format: "wanna-space-export",
    version: 2,
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email },
    settings,
    projects,
    stages,
    tasks,
    pages,
    timeEntries,
    vault: { collections: vaultCollections, items: vaultItems },
  };
}
