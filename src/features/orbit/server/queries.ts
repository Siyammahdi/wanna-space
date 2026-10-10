import "server-only";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { PROJECT_COLORS, type ProjectColor } from "@/features/tasks";
import type { IsoDate } from "@/lib/dates";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, projectStage, task, type Project } from "@/server/db/schema";

import { bySortKey } from "../board";
import type { OrbitProject, OrbitSummary, StageItem } from "../schema";

const toColor = (c: string): ProjectColor =>
  (PROJECT_COLORS as string[]).includes(c) ? (c as ProjectColor) : "fern";

const toProject = (p: Project): OrbitProject => ({
  id: p.id,
  name: p.name,
  keyword: p.keyword,
  color: toColor(p.color),
  icon: p.icon,
  description: p.description,
  status: p.status,
  targetDate: p.targetDate,
});

async function stagesBy(
  spaceId: string,
  projectId?: string,
): Promise<(StageItem & { projectId: string })[]> {
  const rows = await db
    .select({
      id: projectStage.id,
      projectId: projectStage.projectId,
      name: projectStage.name,
      sortKey: projectStage.sortKey,
      wipLimit: projectStage.wipLimit,
    })
    .from(projectStage)
    .where(
      and(
        eq(projectStage.spaceId, spaceId),
        projectId ? eq(projectStage.projectId, projectId) : undefined,
      ),
    );
  return rows.sort(bySortKey);
}

/** Top-level task counts per project, stage and status (overdue = open and due before today). */
async function countsBy(spaceId: string, today: IsoDate, projectId?: string) {
  return db
    .select({
      projectId: task.projectId,
      stageId: task.stageId,
      status: task.status,
      n: sql<number>`count(*)::int`,
      overdue: sql<number>`count(*) filter (where ${task.dueDate} < ${today})::int`,
    })
    .from(task)
    .where(
      and(
        eq(task.spaceId, spaceId),
        isNull(task.parentId),
        projectId ? eq(task.projectId, projectId) : isNotNull(task.projectId),
      ),
    )
    .groupBy(task.projectId, task.stageId, task.status);
}

function summarize(
  p: Project,
  stages: StageItem[],
  counts: Awaited<ReturnType<typeof countsBy>>,
): OrbitSummary {
  const perStage = new Map(stages.map((s) => [s.id, 0]));
  let open = 0;
  let done = 0;
  let overdue = 0;
  for (const c of counts) {
    if (c.status === "done") {
      done += c.n;
      continue;
    }
    open += c.n;
    overdue += c.overdue;
    const stage = c.stageId && perStage.has(c.stageId) ? c.stageId : stages[0]?.id;
    if (stage) perStage.set(stage, perStage.get(stage)! + c.n);
  }
  return {
    ...toProject(p),
    open,
    done,
    overdue,
    stages: stages.map((s) => ({ id: s.id, name: s.name, count: perStage.get(s.id)! })),
  };
}

/** Every active project with its stages and where its tasks stand, in user order. */
export async function listOrbitProjects(today: IsoDate): Promise<OrbitSummary[]> {
  const { space } = await requireSpace();
  const [projects, stages, counts] = await Promise.all([
    db
      .select()
      .from(project)
      .where(and(eq(project.spaceId, space.id), isNull(project.archivedAt)))
      .orderBy(sql`${project.sortKey} collate "C"`),
    stagesBy(space.id),
    countsBy(space.id, today),
  ]);
  return projects.map((p) =>
    summarize(
      p,
      stages.filter((s) => s.projectId === p.id),
      counts.filter((c) => c.projectId === p.id),
    ),
  );
}

/** One project's brief, stages and totals, for its board. */
export async function getOrbitProject(
  id: string,
  today: IsoDate,
): Promise<{ summary: OrbitSummary; stages: StageItem[] } | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { space } = await requireSpace();
  const [[row], stages, counts] = await Promise.all([
    db
      .select()
      .from(project)
      .where(and(eq(project.id, id), eq(project.spaceId, space.id), isNull(project.archivedAt))),
    stagesBy(space.id, id),
    countsBy(space.id, today, id),
  ]);
  if (!row) return null;
  const list = stages.map((s) => ({
    id: s.id,
    name: s.name,
    sortKey: s.sortKey,
    wipLimit: s.wipLimit,
  }));
  return { summary: summarize(row, list, counts), stages: list };
}
