import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { vaultCollection, vaultItem, type VaultItemRow } from "@/server/db/schema";
import { extensionOf, hasPreview, originalUrl, previewUrl } from "@/server/storage";

import type { VaultCollection, VaultItem } from "../schema";

/** The board loads the newest items in one go and filters them in the browser. */
export const VAULT_LIMIT = 1000;

const THUMB_WIDTH = 720;
const FULL_WIDTH = 2000;

export const collectionSortKey = sql`${vaultCollection.sortKey} collate "C"`;

export const domainOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

function previewOf(row: VaultItemRow): VaultItem["preview"] {
  const asset = row.asset;
  if (asset && hasPreview(asset)) {
    const thumb = previewUrl(asset, THUMB_WIDTH);
    const full = previewUrl(asset, FULL_WIDTH);
    if (thumb && full) {
      return { thumb, full, width: asset.width, height: asset.height, remote: false };
    }
  }
  if (row.previewUrl) {
    return { thumb: row.previewUrl, full: row.previewUrl, width: null, height: null, remote: true };
  }
  return null;
}

export function toVaultItem(row: VaultItemRow): VaultItem {
  const asset = row.asset;
  const upload = asset && (row.kind === "image" || row.kind === "file");
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    url: row.url,
    domain: domainOf(row.url),
    siteName: row.siteName,
    iconUrl: row.iconUrl,
    language: row.language,
    collectionId: row.collectionId,
    tags: row.tags,
    colors: row.colors,
    preview: previewOf(row),
    file: upload
      ? {
          name: asset.filename,
          bytes: asset.bytes,
          ext: extensionOf(asset.filename) || (asset.format ?? ""),
          pages: asset.pages,
          media: asset.resourceType === "video" ? originalUrl(asset) : null,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const live = (spaceId: string) => and(eq(vaultItem.spaceId, spaceId), isNull(vaultItem.deletedAt));

export const listVaultItems = cache(async (): Promise<VaultItem[]> => {
  const { space } = await requireSpace();
  const rows = await db
    .select()
    .from(vaultItem)
    .where(live(space.id))
    .orderBy(desc(vaultItem.createdAt), desc(vaultItem.id))
    .limit(VAULT_LIMIT);
  return rows.map(toVaultItem);
});

/** The newest few saves, for Today's "Jump back in". */
export async function listRecentVaultItems(limit = 4): Promise<VaultItem[]> {
  const { space } = await requireSpace();
  const rows = await db
    .select()
    .from(vaultItem)
    .where(live(space.id))
    .orderBy(desc(vaultItem.createdAt), desc(vaultItem.id))
    .limit(limit);
  return rows.map(toVaultItem);
}

export const listVaultCollections = cache(async (): Promise<VaultCollection[]> => {
  const { space } = await requireSpace();
  return db
    .select({ id: vaultCollection.id, name: vaultCollection.name })
    .from(vaultCollection)
    .where(eq(vaultCollection.spaceId, space.id))
    .orderBy(collectionSortKey);
});

/** A live item in the current space, or null. */
export async function getVaultItemRow(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { space } = await requireSpace();
  const [row] = await db
    .select()
    .from(vaultItem)
    .where(and(eq(vaultItem.id, id), live(space.id)));
  return row ?? null;
}
