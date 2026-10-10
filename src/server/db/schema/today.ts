import { sql } from "drizzle-orm";
import { check, date, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { space } from "./spaces";

/**
 * A day's plan in the Today room: a one-line intention and up to three tasks picked as
 * the day's focus (ADR 0018). Picked ids aren't foreign keys: a deleted task just drops
 * out when read.
 */
export const dayPlan = pgTable(
  "day_plan",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    /** The user's local calendar day (floating, ADR 0006). */
    date: date("date", { mode: "string" }).notNull(),
    intention: text("intention").notNull().default(""),
    focusTaskIds: uuid("focus_task_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("day_plan_space_date_idx").on(t.spaceId, t.date),
    check("day_plan_focus_max", sql`cardinality(${t.focusTaskIds}) <= 3`),
    check("day_plan_intention_len", sql`char_length(${t.intention}) <= 140`),
  ],
);

export type DayPlan = typeof dayPlan.$inferSelect;
