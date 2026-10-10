"use server";

import { and, eq, inArray, isNotNull, isNull, sql, TransactionRollbackError } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { purgeTrash, takeFromTrash, trashAssets } from "@/server/asset-trash";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, projectStage, task, type Task } from "@/server/db/schema";
import {
  describeUpload,
  destroyAsset,
  signUpload,
  storageEnabled,
  verifyUpload,
  type StoredAsset,
} from "@/server/storage";

import {
  createTaskInput,
  deletedTasks,
  rollTaskInput,
  setCoverInput,
  updateTaskInput,
  type ActionResult,
  type CreateTaskInput,
  type DeletedTask,
  type RollTaskInput,
  type SetCoverInput,
  type TaskCover,
  type UpdateTaskInput,
} from "../schema";
import { COVER_FORMATS, toCover } from "./cover";

const invalid = (error = "That didn’t look right. Please try again.") => ({
  ok: false as const,
  error,
});

/** A task may only point at a project in the same space. */
async function ownsProject(spaceId: string, projectId: string | null | undefined) {
  if (!projectId) return true;
  const [row] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.spaceId, spaceId)));
  return Boolean(row);
}

/** A stage must be a column of the task's own project, in the same space. */
async function stageInProject(spaceId: string, stageId: string, projectId: string | null) {
  if (!projectId) return false;
  const [row] = await db
    .select({ id: projectStage.id })
    .from(projectStage)
    .where(
      and(
        eq(projectStage.id, stageId),
        eq(projectStage.projectId, projectId),
        eq(projectStage.spaceId, spaceId),
      ),
    );
  return Boolean(row);
}

/** Subtasks hang off a top-level task in the same space (one level deep). */
async function canParent(spaceId: string, parentId: string) {
  const [row] = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.id, parentId), eq(task.spaceId, spaceId), isNull(task.parentId)));
  return Boolean(row);
}

export async function createTask(input: CreateTaskInput): Promise<ActionResult> {
  const parsed = createTaskInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();
  const { parentId, dueDate, dueTime, repeat, stageId } = parsed.data;
  if (!(await ownsProject(space.id, parsed.data.projectId)))
    return invalid("That project no longer exists.");
  if (parentId && !(await canParent(space.id, parentId)))
    return invalid("That task no longer exists.");
  if (stageId && (parentId || !(await stageInProject(space.id, stageId, parsed.data.projectId))))
    return invalid("That stage no longer exists.");

  const [last] = await db
    .select({ key: sql<string | null>`max(${task.sortKey} collate "C")` })
    .from(task)
    .where(eq(task.spaceId, space.id));

  await db.insert(task).values({
    ...parsed.data,
    dueTime: dueDate ? dueTime : null,
    repeat: dueDate && !parentId ? (repeat ?? null) : null,
    spaceId: space.id,
    sortKey: generateKeyBetween(last?.key ?? null, null),
  });

  refresh();
  return { ok: true };
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  const parsed = updateTaskInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, status, ...rest } = parsed.data;
  const { space } = await requireSpace();
  if (!(await ownsProject(space.id, rest.projectId)))
    return invalid("That project no longer exists.");
  if ((rest.repeat && rest.dueDate === undefined) || rest.stageId) {
    const [current] = await db
      .select({ dueDate: task.dueDate, parentId: task.parentId, projectId: task.projectId })
      .from(task)
      .where(and(eq(task.id, id), eq(task.spaceId, space.id)));
    if (!current) return invalid("That task no longer exists.");
    if (rest.repeat && rest.dueDate === undefined && (!current.dueDate || current.parentId))
      return invalid("Give the task a date first.");
    const projectId = rest.projectId !== undefined ? rest.projectId : current.projectId;
    if (
      rest.stageId &&
      (current.parentId || !(await stageInProject(space.id, rest.stageId, projectId)))
    )
      return invalid("That stage no longer exists.");
  }

  const updated = await db
    .update(task)
    .set({
      ...rest,
      // A stage belongs to one project's board; a task moving elsewhere starts at the first.
      ...(rest.projectId !== undefined && rest.stageId === undefined && { stageId: null }),
      // A repeat rule only makes sense with a date to count from.
      ...(rest.dueDate === null && { dueTime: null, repeat: null }),
      ...(rest.notes !== undefined && { notes: rest.notes?.trim() || null }),
      ...(status && { status, completedAt: status === "done" ? new Date() : null }),
    })
    .where(and(eq(task.id, id), eq(task.spaceId, space.id)))
    .returning({ id: task.id });

  if (updated.length === 0) return invalid("That task no longer exists.");
  refresh();
  return { ok: true };
}

/**
 * Completing a recurring task: move it to `dueDate` and reopen its subtasks — or, as the
 * undo, move it back and re-complete them. One transaction, so the two never drift apart.
 */
export async function rollTask(input: RollTaskInput): Promise<ActionResult> {
  const parsed = rollTaskInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, dueDate, subtaskIds, subtaskStatus } = parsed.data;
  const { space } = await requireSpace();

  const ok = await db.transaction(async (tx) => {
    const moved = await tx
      .update(task)
      .set({ dueDate, status: "open", completedAt: null })
      .where(and(eq(task.id, id), eq(task.spaceId, space.id), isNotNull(task.repeat)))
      .returning({ id: task.id });
    if (moved.length === 0) return false;
    if (subtaskIds.length > 0) {
      await tx
        .update(task)
        .set({ status: subtaskStatus, completedAt: subtaskStatus === "done" ? new Date() : null })
        .where(
          and(eq(task.parentId, id), eq(task.spaceId, space.id), inArray(task.id, subtaskIds)),
        );
    }
    return true;
  });

  if (!ok) return invalid("That task no longer repeats.");
  refresh();
  return { ok: true };
}

const snapshot = (row: Task): DeletedTask => ({
  id: row.id,
  title: row.title,
  notes: row.notes,
  status: row.status,
  priority: row.priority,
  dueDate: row.dueDate,
  dueTime: row.dueTime?.slice(0, 5) ?? null,
  repeat: row.repeat,
  projectId: row.projectId,
  stageId: row.stageId,
  parentId: row.parentId,
  completedAt: row.completedAt?.toISOString() ?? null,
  sortKey: row.sortKey,
  coverId: row.cover?.publicId ?? null,
  createdAt: row.createdAt.toISOString(),
});

/** Deletes a task (and, via the FK cascade, its subtasks); returns them for undo. */
export async function deleteTask(id: string): Promise<ActionResult<DeletedTask[]>> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();

  const rows = await db.transaction(async (tx) => {
    const children = await tx
      .select()
      .from(task)
      .where(and(eq(task.parentId, id), eq(task.spaceId, space.id)));
    const [row] = await tx
      .delete(task)
      .where(and(eq(task.id, id), eq(task.spaceId, space.id)))
      .returning();
    if (!row) return [];
    const all = [row, ...children];
    // Covers wait in the trash so undo can bring them back with the task.
    await trashAssets(
      space.id,
      all.flatMap((r) => (r.cover ? [r.cover] : [])),
      tx,
    );
    return all;
  });

  if (rows.length === 0) return invalid("That task no longer exists.");
  if (rows.some((r) => r.cover)) after(() => purgeTrash(space.id).catch(() => {}));
  refresh();
  return { ok: true, data: rows.map(snapshot) };
}

/** Undo for deleteTask: re-inserts the snapshots (parent first) in the caller's space. */
export async function restoreTasks(input: DeletedTask[]): Promise<ActionResult> {
  const parsed = deletedTasks.safeParse(input);
  if (!parsed.success) return invalid();
  const { space } = await requireSpace();
  const rows = parsed.data;

  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) return invalid();
  const existing = await db
    .select({ id: task.id })
    .from(task)
    .where(inArray(task.id, [...ids]))
    .limit(1);
  if (existing.length > 0) return invalid("That task is already back.");

  const outsideParents = [
    ...new Set(rows.flatMap((r) => (r.parentId && !ids.has(r.parentId) ? [r.parentId] : []))),
  ];
  for (const parentId of outsideParents) {
    if (!(await canParent(space.id, parentId))) return invalid("Couldn’t restore that task.");
  }

  const projectIds = [...new Set(rows.flatMap((r) => (r.projectId ? [r.projectId] : [])))];
  const liveProjects = new Set(
    projectIds.length === 0
      ? []
      : (
          await db
            .select({ id: project.id })
            .from(project)
            .where(and(eq(project.spaceId, space.id), inArray(project.id, projectIds)))
        ).map((p) => p.id),
  );

  const stageIds = [...new Set(rows.flatMap((r) => (r.stageId ? [r.stageId] : [])))];
  const liveStages = new Map(
    stageIds.length === 0
      ? []
      : (
          await db
            .select({ id: projectStage.id, projectId: projectStage.projectId })
            .from(projectStage)
            .where(and(eq(projectStage.spaceId, space.id), inArray(projectStage.id, stageIds)))
        ).map((s) => [s.id, s.projectId]),
  );

  const restored = await db
    .transaction(async (tx) => {
      const coverIds = rows.flatMap((r) => (r.coverId ? [r.coverId] : []));
      const covers = new Map(
        (await takeFromTrash(space.id, coverIds, tx)).map((a) => [a.publicId, a]),
      );
      const inserted = await tx
        .insert(task)
        .values(
          rows.map(({ completedAt, createdAt, projectId, stageId, coverId, ...rest }) => ({
            ...rest,
            spaceId: space.id,
            // The project may have been deleted in the meantime; fall back to the Inbox.
            projectId: projectId && liveProjects.has(projectId) ? projectId : null,
            stageId: stageId && liveStages.get(stageId) === projectId ? stageId : null,
            // Past the undo window the file is gone; the task comes back without it.
            cover: (coverId && covers.get(coverId)) || null,
            completedAt: completedAt ? new Date(completedAt) : null,
            createdAt: new Date(createdAt),
          })),
        )
        .onConflictDoNothing({ target: task.id })
        .returning({ id: task.id });
      // Nothing went back in, so the covers stay in the trash too.
      if (inserted.length === 0) tx.rollback();
      return inserted;
    })
    .catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) return [];
      throw error;
    });

  if (restored.length === 0) return invalid("Couldn’t restore that task.");
  refresh();
  return { ok: true };
}

/** Signed fields for posting a cover image straight to storage. */
export async function prepareCoverUpload(
  filename: string,
): Promise<ActionResult<{ url: string; fields: Record<string, string> }>> {
  if (!storageEnabled) return invalid("Image uploads aren’t switched on yet.");
  const parsed = z.string().trim().min(1).max(255).safeParse(filename);
  if (!parsed.success) return invalid();
  const { space } = await requireSpace();
  return { ok: true, data: signUpload(space.id, parsed.data) };
}

/** Sets, replaces, or removes a task's image. A replaced image waits in the trash for undo. */
export async function setTaskCover(input: SetCoverInput): Promise<ActionResult<TaskCover | null>> {
  const parsed = setCoverInput.safeParse(input);
  if (!parsed.success) return invalid();
  const { id, cover } = parsed.data;
  const { space } = await requireSpace();

  let fresh: StoredAsset | null = null;
  if (cover && "upload" in cover) {
    const { publicId, version, signature, resourceType, filename } = cover.upload;
    if (!verifyUpload(space.id, { publicId, version, signature })) {
      return invalid("That upload couldn’t be verified.");
    }
    const stored = await describeUpload(publicId, resourceType, filename);
    if (!stored) return invalid("That upload couldn’t be found. Please try again.");
    if (stored.asset.resourceType !== "image" || !COVER_FORMATS.has(stored.asset.format ?? "")) {
      after(() => destroyAsset(stored.asset).catch(() => {}));
      return invalid("Covers need to be an image.");
    }
    fresh = stored.asset;
  }

  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ cover: task.cover })
      .from(task)
      .where(and(eq(task.id, id), eq(task.spaceId, space.id)))
      .for("update");
    if (!current) return { ok: false as const, error: "That task no longer exists." };
    if (cover && "restore" in cover && current.cover?.publicId === cover.restore) {
      return { ok: true as const, next: current.cover };
    }

    let next: StoredAsset | null = fresh;
    if (cover && "restore" in cover) {
      [next = null] = await takeFromTrash(space.id, [cover.restore], tx);
      if (!next) return { ok: false as const, error: "That image is no longer available." };
    }
    await tx
      .update(task)
      .set({ cover: next })
      .where(and(eq(task.id, id), eq(task.spaceId, space.id)));
    if (current.cover) await trashAssets(space.id, [current.cover], tx);
    return { ok: true as const, next };
  });

  if (!result.ok) {
    if (fresh) after(() => destroyAsset(fresh).catch(() => {}));
    return invalid(result.error);
  }
  after(() => purgeTrash(space.id).catch(() => {}));
  refresh();
  return { ok: true, data: toCover(result.next) };
}
