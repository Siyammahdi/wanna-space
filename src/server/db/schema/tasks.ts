import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type { AssetJson } from "./assets";
import { space } from "./spaces";

/** Mirrors RepeatRule in features/tasks/repeat.ts, which validates it. */
type RepeatJson = {
  freq: "day" | "week" | "month" | "year";
  every: number;
  days?: number[];
  day?: number;
};

export const taskStatus = pgEnum("task_status", ["open", "done"]);
export const projectStatus = pgEnum("project_status", ["planning", "active", "paused", "complete"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const project = pgTable(
  "project",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Lowercase short code that files quick-added tasks here (features/tasks/keywords.ts). */
    keyword: text("keyword").notNull(),
    /** Key into the project palette (features/tasks/projects.ts). */
    color: text("color").notNull().default("fern"),
    /** One emoji, shown in Orbit and the project header. */
    icon: text("icon"),
    /** The project brief (plain text). */
    description: text("description").notNull().default(""),
    status: projectStatus("status").notNull().default("active"),
    /** When the project should land; floating like due dates (ADR 0006). */
    targetDate: date("target_date", { mode: "string" }),
    /** Fractional index (see fractional-indexing); compare with byte order. */
    sortKey: text("sort_key").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("project_space_id_idx").on(t.spaceId),
    uniqueIndex("project_space_keyword_idx").on(t.spaceId, t.keyword),
  ],
);

/** A column on a project's Orbit board. Done is built in, not a stage (ADR 0014). */
export const projectStage = pgTable(
  "project_stage",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Fractional index; compare with byte order. */
    sortKey: text("sort_key").notNull(),
    /** Work-in-progress limit: the column warns past it. */
    wipLimit: smallint("wip_limit"),
    ...timestamps,
  },
  (t) => [
    index("project_stage_project_id_idx").on(t.projectId),
    check("project_stage_wip_limit", sql`${t.wipLimit} between 1 and 99`),
  ],
);

export const task = pgTable(
  "task",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
    /** The task's column on its project's board; null (or another project's) = the first. */
    stageId: uuid("stage_id").references(() => projectStage.id, { onDelete: "set null" }),
    /** Set for subtasks (one level deep); removing the parent removes its subtasks. */
    parentId: uuid("parent_id").references((): AnyPgColumn => task.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatus("status").notNull().default("open"),
    /** 0 = none, 1 = highest … 3 = low. */
    priority: smallint("priority").notNull().default(0),
    /** A calendar day with no time zone ("floating"); see ADR 0006. */
    dueDate: date("due_date", { mode: "string" }),
    /** Optional wall-clock time on the due date, floating like the date. */
    dueTime: time("due_time"),
    /** Repeat rule (features/tasks/repeat.ts, ADR 0007); only set alongside a due date. */
    repeat: jsonb("repeat").$type<RepeatJson>(),
    /** An image shown on the task's cards (ADR 0019). */
    cover: jsonb("cover").$type<AssetJson>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sortKey: text("sort_key").notNull(),
    ...timestamps,
  },
  (t) => [
    index("task_space_status_due_idx").on(t.spaceId, t.status, t.dueDate),
    index("task_project_id_idx").on(t.projectId),
    index("task_parent_id_idx").on(t.parentId),
    index("task_stage_id_idx").on(t.stageId),
  ],
);

export type Task = typeof task.$inferSelect;
export type Project = typeof project.$inferSelect;
export type ProjectStage = typeof projectStage.$inferSelect;
