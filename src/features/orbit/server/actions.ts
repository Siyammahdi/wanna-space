"use server";

import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { STAGE_LIMITS } from "@/lib/settings";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, projectStage, task } from "@/server/db/schema";

import {
  createStageInput,
  deletedStage,
  updateStageInput,
  type ActionResult,
  type CreateStageInput,
  type DeletedStage,
  type UpdateStageInput,
} from "../schema";

const invalid = (error = "That didn’t look right. Please try again.") => ({
  ok: false as const,
  error,
});

const STAGE_CAP = STAGE_LIMITS.count * 2;

async function stageCount(spaceId: string, projectId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(projectStage)
    .where(and(eq(projectStage.spaceId, spaceId), eq(projectStage.projectId, projectId)));
  return row?.n ?? 0;
}

export async function createStage(input: CreateStageInput): Promise<ActionResult> {
  const parsed = createStageInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, parsed.data.projectId), eq(project.spaceId, space.id)));
  if (!owned) return invalid("That project no longer exists.");
  if ((await stageCount(space.id, owned.id)) >= STAGE_CAP) {
    return invalid(`A board holds up to ${STAGE_CAP} stages.`);
  }

  await db.insert(projectStage).values({ ...parsed.data, spaceId: space.id });
  refresh();
  return { ok: true };
}

export async function updateStage(input: UpdateStageInput): Promise<ActionResult> {
  const parsed = updateStageInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) return { ok: true };
  const { space } = await requireSpace();

  const updated = await db
    .update(projectStage)
    .set(patch)
    .where(and(eq(projectStage.id, id), eq(projectStage.spaceId, space.id)))
    .returning({ id: projectStage.id });
  if (updated.length === 0) return invalid("That stage no longer exists.");
  refresh();
  return { ok: true };
}

/**
 * Deletes a stage (never a board's last); its tasks fall back to the first stage
 * (FK on delete set null). Returns what's needed to put it back.
 */
export async function deleteStage(id: string): Promise<ActionResult<DeletedStage>> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();
  const [stage] = await db
    .select()
    .from(projectStage)
    .where(and(eq(projectStage.id, id), eq(projectStage.spaceId, space.id)));
  if (!stage) return invalid("That stage no longer exists.");
  if ((await stageCount(space.id, stage.projectId)) <= 1) {
    return invalid("A board needs at least one stage.");
  }

  const tasks = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.spaceId, space.id), eq(task.stageId, id)));
  await db.delete(projectStage).where(eq(projectStage.id, id));
  refresh();
  return {
    ok: true,
    data: {
      id: stage.id,
      projectId: stage.projectId,
      name: stage.name,
      sortKey: stage.sortKey,
      wipLimit: stage.wipLimit,
      taskIds: tasks.map((t) => t.id),
    },
  };
}

/** Undo for deleteStage: the stage comes back and reclaims tasks that haven't moved since. */
export async function restoreStage(input: DeletedStage): Promise<ActionResult> {
  const parsed = deletedStage.safeParse(input);
  if (!parsed.success) return invalid();
  const { taskIds, ...stage } = parsed.data;
  const { space } = await requireSpace();
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, stage.projectId), eq(project.spaceId, space.id)));
  if (!owned) return invalid("That project no longer exists.");

  await db.transaction(async (tx) => {
    await tx
      .insert(projectStage)
      .values({ ...stage, spaceId: space.id })
      .onConflictDoNothing();
    if (taskIds.length === 0) return;
    await tx
      .update(task)
      .set({ stageId: stage.id })
      .where(
        and(
          eq(task.spaceId, space.id),
          eq(task.projectId, stage.projectId),
          isNull(task.stageId),
          inArray(task.id, taskIds),
        ),
      );
  });
  refresh();
  return { ok: true };
}
