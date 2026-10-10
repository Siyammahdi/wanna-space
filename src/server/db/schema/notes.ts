import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { space } from "./spaces";

/** A Tiptap / ProseMirror document (`{ type: "doc", content: [...] }`), validated by the editor schema. */
type PageDocJson = { type: "doc"; content?: unknown[] };

export const page = pgTable(
  "page",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    /** Nesting: removing a page removes its subpages. */
    parentId: uuid("parent_id").references((): AnyPgColumn => page.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    /** A single emoji, or null for the default page glyph. */
    icon: text("icon"),
    content: jsonb("content").$type<PageDocJson>(),
    /** Plain text from the start of the content, for previews (computed on save). */
    excerpt: text("excerpt").notNull().default(""),
    /** Fractional index among siblings; compare with byte order. */
    sortKey: text("sort_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("page_space_parent_idx").on(t.spaceId, t.parentId),
    index("page_space_updated_idx").on(t.spaceId, t.updatedAt),
  ],
);

export type Page = typeof page.$inferSelect;
