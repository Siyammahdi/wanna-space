"use client";

import { startTransition, useOptimistic, useState } from "react";

import { recordUndo } from "@/components/shell/undo";
import { toast } from "@/components/ui/toast";
import { describeDue, type IsoDate } from "@/lib/dates";
import { playCompletion } from "@/lib/sound";
import { uploadFile } from "@/lib/upload";

import { lastKey } from "../order";
import type { Priority } from "../parse";
import { nextOccurrence } from "../repeat";
import type {
  ActionResult,
  CreateTaskInput,
  DeletedTask,
  TaskCover,
  TaskItem,
  UpdateTaskInput,
} from "../schema";
import {
  createTask,
  deleteTask,
  prepareCoverUpload,
  restoreTasks,
  rollTask,
  setTaskCover,
  updateTask,
} from "../server/actions";

const COVER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/heic",
  "image/heif",
]);
/** Storage's per-file cap. */
const MAX_COVER_BYTES = 10 * 1024 * 1024;

const isCoverFile = (file: File) => COVER_TYPES.has(file.type);

type Op =
  | { type: "add"; task: TaskItem }
  | { type: "update"; id: string; patch: Partial<TaskItem> }
  | { type: "remove"; id: string }
  | { type: "batch"; ops: Op[] };

function reducer(tasks: TaskItem[], op: Op): TaskItem[] {
  switch (op.type) {
    case "add":
      return tasks.some((t) => t.id === op.task.id) ? tasks : [...tasks, op.task];
    case "update":
      return tasks.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t));
    case "remove":
      return tasks.filter((t) => t.id !== op.id && t.parentId !== op.id);
    case "batch":
      return op.ops.reduce(reducer, tasks);
  }
}

type Deletion = Promise<ActionResult<DeletedTask[]>>;

type UpdateOptions = {
  /** Toast message with an Undo button (defaults on for completing and moving). */
  announce?: string;
  /** False when the change is itself an undo or redo. */
  record?: boolean;
};

const quote = (title: string) => `“${title.length > 40 ? `${title.slice(0, 39)}…` : title}”`;

function describeUpdate(prev: TaskItem, patch: Omit<UpdateTaskInput, "id">, today: IsoDate) {
  const name = quote(prev.title);
  // Subtasks are small, frequent changes: undoable, but never toasted.
  const loud = prev.parentId === null;
  if (patch.sortKey !== undefined) {
    // Reordering is direct manipulation; only a date change is worth a toast.
    if (patch.dueDate === undefined) return { label: `Moved ${name}` };
    const when = patch.dueDate ? describeDue(patch.dueDate, today).label : "No date";
    return { label: name, announce: `Moved to ${when}` };
  }
  if (patch.status === "done") return { label: name, announce: loud ? "Completed" : undefined };
  if (patch.status === "open") return { label: `Reopened ${name}` };
  if (patch.projectId !== undefined) return { label: name, announce: loud ? "Moved" : undefined };
  if (patch.stageId !== undefined) return { label: `Moved ${name}` };
  if (patch.title !== undefined) return { label: `Renamed ${name}` };
  if (patch.notes !== undefined) return { label: `Notes on ${name}` };
  if (patch.repeat !== undefined) return { label: `Repeat of ${name}` };
  if (patch.dueDate !== undefined || patch.dueTime !== undefined)
    return { label: `Due date of ${name}` };
  if (patch.priority !== undefined) return { label: `Priority of ${name}` };
  return { label: `Edited ${name}` };
}

/**
 * Optimistic task list: every change paints on the current frame, the Server
 * Action persists it and refresh() brings back the truth in the same round trip.
 * Every change is undoable and redoable (components/shell/undo.tsx).
 */
export function useTasks(serverTasks: TaskItem[], today: IsoDate) {
  const [tasks, apply] = useOptimistic(serverTasks, reducer);
  const [error, setError] = useState<string | null>(null);

  function run(op: Op, action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      apply(op);
      try {
        const result = await action();
        if (!result.ok) setError(result.error);
      } catch {
        setError("Couldn’t save that change. Check your connection and try again.");
      }
    });
  }

  function erase(id: string): Deletion {
    const deletion = deleteTask(id);
    run({ type: "remove", id }, () => deletion);
    return deletion;
  }

  function restore(task: TaskItem, deletion: Deletion) {
    run({ type: "add", task }, async () => {
      const result = await deletion;
      return result.ok ? restoreTasks(result.data) : result;
    });
  }

  function add(input: CreateTaskInput) {
    const task: TaskItem = {
      ...input,
      stageId: input.stageId ?? null,
      repeat: input.dueDate && !input.parentId ? (input.repeat ?? null) : null,
      notes: null,
      priority: input.priority as Priority,
      status: "open",
      completedAt: null,
      sortKey: lastKey(tasks),
      cover: null,
    };
    run({ type: "add", task }, () => createTask(input));

    let deletion: Deletion | null = null;
    recordUndo({
      label: `Added ${quote(task.title)}`,
      undo: () => (deletion = erase(task.id)),
      redo: () => deletion && restore(task, deletion),
    });
  }

  /** Moves a recurring task to `dueDate`, setting the listed subtasks' status with it. */
  function move(id: string, dueDate: IsoDate, subtaskIds: string[], status: "open" | "done") {
    const completedAt = status === "done" ? new Date().toISOString() : null;
    const ops: Op[] = [
      { type: "update", id, patch: { dueDate, status: "open", completedAt: null } },
      ...subtaskIds.map((s): Op => ({ type: "update", id: s, patch: { status, completedAt } })),
    ];
    run({ type: "batch", ops }, () => rollTask({ id, dueDate, subtaskIds, subtaskStatus: status }));
  }

  /** Completing a recurring task schedules its next occurrence with a fresh checklist. */
  function roll(prev: TaskItem & { dueDate: IsoDate }) {
    const next = nextOccurrence(prev.repeat!, prev.dueDate, today);
    playCompletion();
    const reopened = tasks
      .filter((t) => t.parentId === prev.id && t.status === "done")
      .map((t) => t.id);
    move(prev.id, next, reopened, "open");
    recordUndo(
      {
        label: quote(prev.title),
        undo: () => move(prev.id, prev.dueDate, reopened, "done"),
        redo: () => move(prev.id, next, reopened, "open"),
      },
      `Done · next ${describeDue(next, today).label}`,
    );
  }

  function update(input: UpdateTaskInput, { announce, record = true }: UpdateOptions = {}) {
    const { id, ...patch } = input;
    const prev = tasks.find((t) => t.id === id);

    const completesSeries =
      patch.status === "done" && Object.keys(patch).length === 1 && prev?.status === "open";
    if (completesSeries && prev.repeat && prev.dueDate) {
      return roll({ ...prev, dueDate: prev.dueDate });
    }

    const optimistic: Partial<TaskItem> = { ...patch, priority: patch.priority as Priority };
    if (patch.priority === undefined) delete optimistic.priority;
    if (patch.dueDate === null) {
      optimistic.dueTime = null;
      optimistic.repeat = null;
    }
    if (patch.projectId !== undefined && patch.stageId === undefined) optimistic.stageId = null;
    if (patch.status) {
      optimistic.completedAt = patch.status === "done" ? new Date().toISOString() : null;
    }
    run({ type: "update", id, patch: optimistic }, () => updateTask(input));

    if (!record || !prev) return;
    if (patch.status === "done" && prev.status === "open") playCompletion();
    const inverse: UpdateTaskInput = { id };
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      (inverse as Record<string, unknown>)[key] = prev[key];
    }
    if (patch.dueDate === null) {
      inverse.dueTime = prev.dueTime;
      inverse.repeat = prev.repeat;
    }
    if (patch.projectId !== undefined && patch.stageId === undefined) {
      inverse.stageId = prev.stageId;
    }

    const { label, announce: auto } = describeUpdate(prev, patch, today);
    recordUndo(
      {
        label,
        undo: () => update(inverse, { record: false }),
        redo: () => update(input, { record: false }),
      },
      announce ?? auto,
    );
  }

  function remove(id: string) {
    const prev = tasks.find((t) => t.id === id);
    let deletion = erase(id);
    if (!prev) return;
    recordUndo(
      {
        label: quote(prev.title),
        undo: () => restore(prev, deletion),
        redo: () => (deletion = erase(id)),
      },
      "Deleted",
    );
  }

  /** Puts back a cover that was there before (undo/redo): the file waits in the trash. */
  function saveCover(id: string, cover: TaskCover | null) {
    run({ type: "update", id, patch: { cover } }, () =>
      setTaskCover({ id, cover: cover && { restore: cover.id } }),
    );
  }

  /** Uploads `file` as the task's image (the local preview shows meanwhile), or removes it. */
  function setCover(id: string, file: File | null) {
    const prev = tasks.find((t) => t.id === id);
    if (!prev) return;
    const before = prev.cover?.pending ? null : prev.cover;
    const label = `Image on ${quote(prev.title)}`;

    if (!file) {
      if (!before) return;
      saveCover(id, null);
      recordUndo(
        { label, undo: () => saveCover(id, before), redo: () => saveCover(id, null) },
        "Image removed",
      );
      return;
    }
    if (!isCoverFile(file)) {
      return toast({ message: "Use an image: JPG, PNG, WebP, GIF, AVIF, or HEIC." });
    }
    if (file.size > MAX_COVER_BYTES) return toast({ message: "Images can be up to 10 MB." });

    const preview = URL.createObjectURL(file);
    const pending: TaskCover = { id: "", url: preview, width: null, height: null, pending: true };
    // Failures toast rather than alert: the task panel may be covering the board.
    const fail = (message: string) => {
      toast({ message });
      return { ok: true as const };
    };
    run({ type: "update", id, patch: { cover: pending } }, async () => {
      try {
        const target = await prepareCoverUpload(file.name);
        if (!target.ok) return fail(target.error);
        const sent = await uploadFile(target.data, file, () => {}).catch(() => null);
        if (!sent) return fail("Couldn’t upload that image. Check your connection and try again.");
        const result = await setTaskCover({
          id,
          cover: {
            upload: {
              publicId: sent.public_id,
              version: sent.version,
              signature: sent.signature,
              resourceType: sent.resource_type,
              filename: file.name,
            },
          },
        });
        if (!result.ok) return fail(result.error);
        const next = result.data;
        if (next) {
          recordUndo(
            { label, undo: () => saveCover(id, before), redo: () => saveCover(id, next) },
            before ? "Image replaced" : "Image added",
          );
        }
        return result;
      } finally {
        // The stored image has taken over by the time this fires.
        window.setTimeout(() => URL.revokeObjectURL(preview), 10_000);
      }
    });
  }

  return { tasks, error, dismissError: () => setError(null), add, update, remove, setCover };
}

export type TaskActions = Pick<
  ReturnType<typeof useTasks>,
  "add" | "update" | "remove" | "setCover"
>;
