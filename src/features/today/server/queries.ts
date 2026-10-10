import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { IsoDate } from "@/lib/dates";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { dayPlan, task } from "@/server/db/schema";

import type { DayPlanItem } from "../schema";

/** The plan for `date`, keeping only picked tasks that still exist in this space. */
export async function getDayPlan(date: IsoDate): Promise<DayPlanItem> {
  const { space } = await requireSpace();
  const [row] = await db
    .select({ intention: dayPlan.intention, focus: dayPlan.focusTaskIds })
    .from(dayPlan)
    .where(and(eq(dayPlan.spaceId, space.id), eq(dayPlan.date, date)));
  if (!row) return { intention: "", focus: [] };
  if (row.focus.length === 0) return row;

  const alive = await db
    .select({ id: task.id })
    .from(task)
    .where(and(eq(task.spaceId, space.id), inArray(task.id, row.focus)));
  const ids = new Set(alive.map((t) => t.id));
  return { intention: row.intention, focus: row.focus.filter((id) => ids.has(id)) };
}
