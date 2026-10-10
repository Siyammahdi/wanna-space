import { z } from "zod";

export const INTENTION_MAX = 140;
export const FOCUS_MAX = 3;

/** The day's plan as the Today room shows it (an empty plan when nothing's set). */
export type DayPlanItem = {
  intention: string;
  /** Up to three task ids, in the order picked. */
  focus: string[];
};

export type ActionResult = { ok: true } | { ok: false; error: string };

const isoDate = z.iso.date();

export const setIntentionInput = z.object({
  date: isoDate,
  intention: z.string().trim().max(INTENTION_MAX, "Keep it to one short line."),
});
export type SetIntentionInput = z.input<typeof setIntentionInput>;

export const setFocusInput = z.object({
  date: isoDate,
  taskIds: z
    .array(z.uuid())
    .max(FOCUS_MAX, `Pick up to ${FOCUS_MAX} tasks.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each task can be picked once."),
});
export type SetFocusInput = z.input<typeof setFocusInput>;
