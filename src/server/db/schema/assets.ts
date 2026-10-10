import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { space } from "./spaces";

/** Mirrors StoredAsset in server/storage, which writes it. */
export type AssetJson = {
  provider: "cloudinary";
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string | null;
  version: number;
  bytes: number;
  width: number | null;
  height: number | null;
  pages: number | null;
  filename: string;
};

/**
 * Stored files that were removed or replaced (a task's cover, say). Undo takes them back
 * out; a week later the file is deleted from storage and the row with it (ADR 0019).
 */
export const assetTrash = pgTable(
  "asset_trash",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    asset: jsonb("asset").$type<AssetJson>().notNull(),
    trashedAt: timestamp("trashed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("asset_trash_space_public_id_idx").on(t.spaceId, t.publicId),
    index("asset_trash_trashed_at_idx").on(t.trashedAt),
  ],
);
