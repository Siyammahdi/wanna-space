import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { space } from "./spaces";
import { task } from "./tasks";

export const timeEntrySource = pgEnum("time_entry_source", ["pomodoro", "stopwatch", "manual"]);
export const timerMode = pgEnum("timer_mode", ["pomodoro", "stopwatch"]);
export const timerPhase = pgEnum("timer_phase", ["focus", "short_break", "long_break"]);

/** A block of focused time: logged by the timer or added by hand. */
export const timeEntry = pgTable(
  "time_entry",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Deleting the task keeps the time, unattached. */
    taskId: uuid("task_id").references(() => task.id, { onDelete: "set null" }),
    source: timeEntrySource("source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    /** Focused time; can be less than ended − started when the timer was paused. */
    seconds: integer("seconds").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("time_entry_space_started_idx").on(t.spaceId, t.startedAt),
    index("time_entry_task_idx").on(t.taskId),
    check("time_entry_seconds", sql`${t.seconds} between 1 and 86400`),
    check("time_entry_range", sql`${t.endedAt} >= ${t.startedAt}`),
  ],
);

/**
 * The user's one timer, kept on the server so it survives reloads and follows them
 * between devices. Running = `run_started_at` is set; time before the current run is in
 * `elapsed_ms`. No row means an idle pomodoro timer.
 */
export const activeTimer = pgTable("active_timer", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => space.id, { onDelete: "cascade" }),
  mode: timerMode("mode").notNull().default("pomodoro"),
  phase: timerPhase("phase").notNull().default("focus"),
  taskId: uuid("task_id").references(() => task.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
  runStartedAt: timestamp("run_started_at", { withTimezone: true }),
  elapsedMs: integer("elapsed_ms").notNull().default(0),
  /** When the current focus session first started (the logged entry's start). */
  sessionStartedAt: timestamp("session_started_at", { withTimezone: true }),
  /** Focus rounds completed since the last long break. */
  rounds: smallint("rounds").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type TimeEntry = typeof timeEntry.$inferSelect;
export type ActiveTimer = typeof activeTimer.$inferSelect;
