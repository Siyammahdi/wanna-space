import { z } from "zod";

import type { IsoDate } from "@/lib/dates";

import { keywordProblem, normalizeKeyword } from "./keywords";
import type { Priority } from "./parse";
import { PROJECT_COLORS, type ProjectColor } from "./projects";
import { repeatRule, type RepeatRule } from "./repeat";

/** The serializable shape the UI works with (server → client). */
export type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: IsoDate | null;
  /** "HH:MM", only alongside a due date. */
  dueTime: string | null;
  /** Only alongside a due date; completing moves the task to its next occurrence. */
  repeat: RepeatRule | null;
  priority: Priority;
  status: "open" | "done";
  completedAt: string | null;
  projectId: string | null;
  /** The task's column on its project's Orbit board (null = the first one). */
  stageId: string | null;
  /** Set for subtasks; boards list them under their parent, not on their own. */
  parentId: string | null;
  /** Manual order among tasks due at the same moment (fractional index, byte order). */
  sortKey: string;
  cover: TaskCover | null;
};

/** The image on a task's cards. */
export type TaskCover = {
  /** The stored file's id; undo and redo pass it back to restore the image. */
  id: string;
  /** A signed, resized URL (or a local preview while uploading). */
  url: string;
  width: number | null;
  height: number | null;
  /** Still uploading. */
  pending?: boolean;
};

export type ProjectItem = {
  id: string;
  name: string;
  /** Typing it in quick add ("twp" or "#twp") files the task here. */
  keyword: string;
  color: ProjectColor;
  openCount: number;
};

/** Which tasks a board shows. */
export type TaskScope = { kind: "all" } | { kind: "inbox" } | { kind: "project"; id: string };

export const inScope = (task: Pick<TaskItem, "projectId">, scope: TaskScope) =>
  scope.kind === "all" ||
  (scope.kind === "inbox" ? task.projectId === null : task.projectId === scope.id);

const isoDate = z.iso.date();
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const priority = z.int().min(0).max(3);
const notes = z.string().max(20_000, "Notes are limited to 20,000 characters").nullable();
const sortKey = z.string().regex(/^[0-9A-Za-z]{1,128}$/);

export const createTaskInput = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Give the task a title").max(500),
  dueDate: isoDate.nullable(),
  dueTime: clockTime.nullable(),
  repeat: repeatRule.nullable().optional(),
  priority,
  projectId: z.uuid().nullable(),
  stageId: z.uuid().nullable().optional(),
  parentId: z.uuid().nullable(),
});

export const updateTaskInput = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  notes: notes.optional(),
  dueDate: isoDate.nullable().optional(),
  dueTime: clockTime.nullable().optional(),
  repeat: repeatRule.nullable().optional(),
  priority: priority.optional(),
  status: z.enum(["open", "done"]).optional(),
  projectId: z.uuid().nullable().optional(),
  stageId: z.uuid().nullable().optional(),
  sortKey: sortKey.optional(),
});

const projectName = z
  .string()
  .trim()
  .min(1, "Name the project")
  .max(80, "Keep it under 80 characters");
const projectColor = z.enum(PROJECT_COLORS as [ProjectColor, ...ProjectColor[]]);

const projectIcon = z.string().max(16).nullable();

const projectKeyword = z
  .string()
  .transform(normalizeKeyword)
  .superRefine((keyword, ctx) => {
    const problem = keywordProblem(keyword);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const PROJECT_STATUSES = ["planning", "active", "paused", "complete"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const createProjectInput = z.object({
  id: z.uuid(),
  name: projectName,
  color: projectColor,
  icon: projectIcon.optional(),
  /** Suggested from the name when missing or already taken. */
  keyword: z.string().optional(),
});
export const updateProjectInput = z.object({
  id: z.uuid(),
  name: projectName.optional(),
  keyword: projectKeyword.optional(),
  color: projectColor.optional(),
  icon: projectIcon.optional(),
  description: z.string().max(2_000, "Keep the brief under 2,000 characters").optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  targetDate: isoDate.nullable().optional(),
});

/** Moves a recurring task to another occurrence and sets its subtasks' status in one step. */
export const rollTaskInput = z.object({
  id: z.uuid(),
  dueDate: isoDate,
  subtaskIds: z.array(z.uuid()).max(500),
  subtaskStatus: z.enum(["open", "done"]),
});

const storedId = z.string().min(1).max(300);

/**
 * A task's image: null removes it, `restore` brings back one removed earlier (undo/redo),
 * `upload` adopts a fresh upload once storage vouches for it.
 */
export const setCoverInput = z.object({
  id: z.uuid(),
  cover: z
    .union([
      z.object({ restore: storedId }),
      z.object({
        upload: z.object({
          publicId: storedId,
          version: z.int().positive(),
          signature: z.string().min(1).max(200),
          resourceType: z.enum(["image", "video", "raw"]),
          filename: z.string().trim().min(1).max(255),
        }),
      }),
    ])
    .nullable(),
});

export type SetCoverInput = z.infer<typeof setCoverInput>;
export type CreateTaskInput = z.input<typeof createTaskInput>;
export type UpdateTaskInput = z.input<typeof updateTaskInput>;
export type RollTaskInput = z.infer<typeof rollTaskInput>;
export type CreateProjectInput = z.input<typeof createProjectInput>;
export type UpdateProjectInput = z.input<typeof updateProjectInput>;

/** Everything needed to put a deleted task back exactly where it was. */
export const deletedTask = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(500),
  notes,
  status: z.enum(["open", "done"]),
  priority,
  dueDate: isoDate.nullable(),
  dueTime: clockTime.nullable(),
  repeat: repeatRule.nullable(),
  projectId: z.uuid().nullable(),
  stageId: z.uuid().nullable().optional(),
  parentId: z.uuid().nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  sortKey,
  /** The cover's stored file, taken back out of the trash on restore. */
  coverId: storedId.nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type DeletedTask = z.infer<typeof deletedTask>;

/** A task and its subtasks, parent first. */
export const deletedTasks = z.array(deletedTask).min(1).max(500);

export type ActionResult<T = void> =
  (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };
