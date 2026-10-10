import { sql, type SQL } from "drizzle-orm";
import {
  customType,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { AssetJson } from "./assets";
import { space } from "./spaces";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const vaultItemKind = pgEnum("vault_item_kind", [
  "link",
  "image",
  "file",
  "snippet",
  "note",
]);

/** A named group of vault items (an item sits in at most one). */
export const vaultCollection = pgTable(
  "vault_collection",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Fractional index (see fractional-indexing); compare with byte order. */
    sortKey: text("sort_key").notNull(),
    ...timestamps,
  },
  (t) => [index("vault_collection_space_idx").on(t.spaceId)],
);

/** Anything saved to the Vault: a link, an upload, a code snippet, or a note. */
export const vaultItem = pgTable(
  "vault_item",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => vaultCollection.id, {
      onDelete: "set null",
    }),
    kind: vaultItemKind("kind").notNull(),
    title: text("title").notNull().default(""),
    /** The note's text, the snippet's code, or the user's notes on anything else. */
    body: text("body").notNull().default(""),
    /** Links: the page (after redirects). */
    url: text("url"),
    siteName: text("site_name"),
    iconUrl: text("icon_url"),
    /** A link's share image when it couldn't be stored (hotlinked). */
    previewUrl: text("preview_url"),
    /** Snippets: the code's language. */
    language: text("language"),
    /** The uploaded file, or a link's stored share image. */
    asset: jsonb("asset").$type<AssetJson>(),
    /** Dominant colors, `#RRGGBB`, most prominent first. */
    colors: text("colors")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('simple', ${vaultItem.title} || ' ' || ${vaultItem.body} || ' ' || coalesce(${vaultItem.url}, '') || ' ' || coalesce(${vaultItem.siteName}, '') || ' ' || coalesce(${vaultItem.asset} ->> 'filename', ''))`,
    ),
    /** Soft delete: undo brings it back; files are purged a week later. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("vault_item_space_created_idx").on(t.spaceId, t.createdAt),
    index("vault_item_collection_idx").on(t.collectionId),
    index("vault_item_search_idx").using("gin", t.search),
    index("vault_item_tags_idx").using("gin", t.tags),
  ],
);

export type VaultItemRow = typeof vaultItem.$inferSelect;
export type VaultCollectionRow = typeof vaultCollection.$inferSelect;
