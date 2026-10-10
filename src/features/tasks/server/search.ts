import "server-only";

import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { Route } from "next";

import type { PaletteResult } from "@/components/shell/command-palette";
import { containsPattern, hasAll, snippet } from "@/lib/search";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, task } from "@/server/db/schema";

import { taskSortKey } from "./queries";

/**
 * Tasks whose title or notes contain every word, title matches and open tasks first.
 * Subtasks link to their parent's panel.
 */
export async function searchTasks(words: string[], limit = 6): Promise<PaletteResult[]> {
  const { space } = await requireSpace();
  const patterns = words.map(containsPattern);
  const inTitle = and(...patterns.map((p) => ilike(task.title, p)));

  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      notes: task.notes,
      parentId: task.parentId,
      status: task.status,
      projectName: project.name,
    })
    .from(task)
    .leftJoin(project, eq(project.id, task.projectId))
    .where(
      and(
        eq(task.spaceId, space.id),
        ...patterns.map((p) => or(ilike(task.title, p), ilike(task.notes, p))),
      ),
    )
    .orderBy(
      sql`(${inTitle}) desc`,
      sql`(${task.status} = 'open') desc`,
      sql`${task.dueDate} asc nulls last`,
      taskSortKey,
    )
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    group: "Tasks",
    label: r.title,
    hint: [r.parentId && "Subtask", r.projectName ?? "Inbox", r.status === "done" && "Done"]
      .filter(Boolean)
      .join(" · "),
    snippet: hasAll(r.title, words) ? undefined : snippet(r.notes, words),
    href: `/tasks?task=${r.parentId ?? r.id}` as Route,
    glyph: r.status === "done" ? "task-done" : "task",
  }));
}
