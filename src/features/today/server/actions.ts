"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { dayPlan, task } from "@/server/db/schema";

import {
  setFocusInput,
  setIntentionInput,
  type ActionResult,
  type SetFocusInput,
  type SetIntentionInput,
} from "../schema";

const invalid = (error = "That didn’t look right. Please try again.") => ({
  ok: false as const,
  error,
});

export async function setIntention(input: SetIntentionInput): Promise<ActionResult> {
  const parsed = setIntentionInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();
  const { date, intention } = parsed.data;

  await db
    .insert(dayPlan)
    .values({ spaceId: space.id, date, intention })
    .onConflictDoUpdate({
      target: [dayPlan.spaceId, dayPlan.date],
      set: { intention, updatedAt: new Date() },
    });
  return { ok: true };
}

export async function setFocusTasks(input: SetFocusInput): Promise<ActionResult> {
  const parsed = setFocusInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();
  const { date, taskIds } = parsed.data;

  if (taskIds.length > 0) {
    const owned = await db
      .select({ id: task.id })
      .from(task)
      .where(and(eq(task.spaceId, space.id), isNull(task.parentId), inArray(task.id, taskIds)));
    if (owned.length !== taskIds.length) return invalid("That task no longer exists.");
  }

  await db
    .insert(dayPlan)
    .values({ spaceId: space.id, date, focusTaskIds: taskIds })
    .onConflictDoUpdate({
      target: [dayPlan.spaceId, dayPlan.date],
      set: { focusTaskIds: taskIds, updatedAt: new Date() },
    });
  refresh();
  return { ok: true };
}
