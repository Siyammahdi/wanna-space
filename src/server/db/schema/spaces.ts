import { sql } from "drizzle-orm";
import { pgEnum, pgTable, primaryKey, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Every domain row belongs to a space. Each user gets one personal space at
 * sign-up; shared spaces later only need more memberships, not a migration.
 */

export const spaceKind = pgEnum("space_kind", ["personal"]);
export const spaceRole = pgEnum("space_role", ["owner"]);

export const space = pgTable("space", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  name: text("name").notNull(),
  kind: spaceKind("kind").notNull().default("personal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const spaceMember = pgTable(
  "space_member",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: spaceRole("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.spaceId, t.userId] }),
    index("space_member_user_id_idx").on(t.userId),
  ],
);
