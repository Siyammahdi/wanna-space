import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { project } from "./tasks";

export const timeFormat = pgEnum("time_format", ["12h", "24h"]);

/**
 * Account-level preferences that follow the user to every device. Device-level ones
 * (theme, motion, hints, sounds) live in the browser. A missing row means the defaults.
 */
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday. */
    weekStartsOn: smallint("week_starts_on").notNull().default(6),
    timeFormat: timeFormat("time_format").notNull().default("12h"),
    /** Focus timer (ranges mirror TIMER_LIMITS in lib/settings.ts). */
    focusMinutes: smallint("focus_minutes").notNull().default(25),
    shortBreakMinutes: smallint("short_break_minutes").notNull().default(5),
    longBreakMinutes: smallint("long_break_minutes").notNull().default(15),
    longBreakEvery: smallint("long_break_every").notNull().default(4),
    /** A break ending while you're here starts the next focus round. */
    autoStartFocus: boolean("auto_start_focus").notNull().default(false),
    /** Minutes of focus to aim for each day; 0 = no goal. */
    dailyFocusGoal: smallint("daily_focus_goal").notNull().default(0),
    /** The room the app opens on (a RoomId; unknown values fall back to Today). */
    startRoom: text("start_room").notNull().default("today"),
    /** Rooms left out of the sidebar and the mobile bar. */
    hiddenRooms: text("hidden_rooms")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Where quick capture files tasks without a #project; null = the Inbox. */
    captureProjectId: uuid("capture_project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    /** The stages a new project's Orbit board starts with. */
    defaultStages: text("default_stages")
      .array()
      .notNull()
      .default(sql`'{"To do","In progress","Review"}'::text[]`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("user_settings_week_starts_on", sql`${t.weekStartsOn} between 0 and 6`),
    check("user_settings_focus_minutes", sql`${t.focusMinutes} between 5 and 180`),
    check("user_settings_short_break_minutes", sql`${t.shortBreakMinutes} between 1 and 60`),
    check("user_settings_long_break_minutes", sql`${t.longBreakMinutes} between 1 and 90`),
    check("user_settings_long_break_every", sql`${t.longBreakEvery} between 2 and 12`),
    check("user_settings_daily_focus_goal", sql`${t.dailyFocusGoal} between 0 and 720`),
  ],
);
