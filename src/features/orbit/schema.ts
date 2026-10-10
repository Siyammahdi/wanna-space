import { z } from "zod";

import type { ProjectColor, ProjectStatus } from "@/features/tasks";
import type { IsoDate } from "@/lib/dates";
import { STAGE_LIMITS } from "@/lib/settings";

/** A column on a project's board. Done is built in and never a stage (ADR 0014). */
export type StageItem = {
  id: string;
  name: string;
  /** Fractional index, byte order. */
  sortKey: string;
  wipLimit: number | null;
};

export type OrbitProject = {
  id: string;
  name: string;
  keyword: string;
  color: ProjectColor;
  icon: string | null;
  description: string;
  status: ProjectStatus;
  targetDate: IsoDate | null;
};

/** A project as the overview shows it: brief, stages and where its tasks stand. */
export type OrbitSummary = OrbitProject & {
  open: number;
  done: number;
  overdue: number;
  stages: { id: string; name: string; count: number }[];
};

export type ActionResult<T = void> =
  (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

const stageName = z
  .string()
  .trim()
  .min(1, "Name the stage")
  .max(STAGE_LIMITS.nameLength, `Keep it under ${STAGE_LIMITS.nameLength} characters`);
const sortKey = z.string().regex(/^[0-9A-Za-z]{1,128}$/);

export const createStageInput = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: stageName,
  sortKey,
});

export const updateStageInput = z.object({
  id: z.uuid(),
  name: stageName.optional(),
  wipLimit: z.int().min(1).max(99).nullable().optional(),
  sortKey: sortKey.optional(),
});

/** Everything needed to put a deleted stage back, tasks included. */
export const deletedStage = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: stageName,
  sortKey,
  wipLimit: z.int().min(1).max(99).nullable(),
  taskIds: z.array(z.uuid()).max(2_000),
});

export type CreateStageInput = z.infer<typeof createStageInput>;
export type UpdateStageInput = z.infer<typeof updateStageInput>;
export type DeletedStage = z.infer<typeof deletedStage>;
