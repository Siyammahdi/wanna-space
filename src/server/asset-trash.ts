import "server-only";

import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { assetTrash } from "@/server/db/schema";
import { destroyAsset, type StoredAsset } from "@/server/storage";

/** How long a removed file can still come back with undo. */
const KEEP_DAYS = 7;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** Sets files aside instead of deleting them, so undo can bring them back. */
export async function trashAssets(spaceId: string, assets: StoredAsset[], ex: Executor = db) {
  if (assets.length === 0) return;
  await ex
    .insert(assetTrash)
    .values(assets.map((asset) => ({ spaceId, publicId: asset.publicId, asset })))
    .onConflictDoNothing();
}

/** Takes files back out of the space's trash; the ones already purged are simply missing. */
export async function takeFromTrash(
  spaceId: string,
  publicIds: string[],
  ex: Executor = db,
): Promise<StoredAsset[]> {
  if (publicIds.length === 0) return [];
  const rows = await ex
    .delete(assetTrash)
    .where(and(eq(assetTrash.spaceId, spaceId), inArray(assetTrash.publicId, publicIds)))
    .returning({ asset: assetTrash.asset });
  return rows.map((r) => r.asset as StoredAsset);
}

/** Deletes the space's files that have sat in the trash past the undo window. */
export async function purgeTrash(spaceId: string) {
  const old = await db
    .delete(assetTrash)
    .where(
      and(
        eq(assetTrash.spaceId, spaceId),
        lt(assetTrash.trashedAt, sql`now() - make_interval(days => ${KEEP_DAYS})`),
      ),
    )
    .returning({ asset: assetTrash.asset });
  await Promise.all(old.map((r) => destroyAsset(r.asset as StoredAsset)));
}
