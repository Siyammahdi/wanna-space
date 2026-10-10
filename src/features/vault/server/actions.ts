"use server";

import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { vaultCollection, vaultItem } from "@/server/db/schema";
import {
  describeUpload,
  destroyAsset,
  importRemoteImage,
  signUpload,
  storageEnabled,
  verifyUpload,
  type StoredAsset,
} from "@/server/storage";

import { guessLanguage } from "../language";
import {
  collectionName,
  createNoteInput,
  createSnippetInput,
  createUploadInput,
  saveLinkInput,
  signUploadInput,
  updateItemInput,
  type ActionResult,
  type CreateNoteInput,
  type CreateSnippetInput,
  type CreateUploadInput,
  type SaveLinkInput,
  type UpdateItemInput,
  type VaultCollection,
  type VaultResult,
} from "../schema";
import { collectionSortKey, domainOf, toVaultItem } from "./queries";
import { normalizeUrl, unfurl } from "./unfurl";

/** Deleted items stay restorable this long before their files are removed. */
const PURGE_AFTER_DAYS = 7;

const invalid = (error = "That didn’t look right. Please try again.") => ({
  ok: false as const,
  error,
});

/** A collection id only counts if it belongs to the space. */
async function ownCollection(spaceId: string, id: string | null) {
  if (!id) return null;
  const [row] = await db
    .select({ id: vaultCollection.id })
    .from(vaultCollection)
    .where(and(eq(vaultCollection.id, id), eq(vaultCollection.spaceId, spaceId)));
  return row?.id ?? null;
}

const filenameOf = (url: URL) => {
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  return last.slice(0, 120) || url.hostname;
};

export async function saveLink(
  input: SaveLinkInput,
): Promise<VaultResult & { existing?: boolean }> {
  const parsed = saveLinkInput.safeParse(input);
  if (!parsed.success) return invalid();
  const url = normalizeUrl(parsed.data.url);
  if (!url) return invalid("That doesn’t look like a web address.");
  const { space } = await requireSpace();

  const [existing] = await db
    .select()
    .from(vaultItem)
    .where(
      and(
        eq(vaultItem.spaceId, space.id),
        isNull(vaultItem.deletedAt),
        eq(vaultItem.url, url.toString()),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, item: toVaultItem(existing), existing: true };

  const [meta, collectionId] = await Promise.all([
    unfurl(url),
    ownCollection(space.id, parsed.data.collectionId),
  ]);
  const stored = meta.imageUrl
    ? await importRemoteImage(
        space.id,
        meta.imageUrl,
        meta.isImage ? filenameOf(new URL(meta.url)) : "preview",
      )
    : null;

  const [row] = await db
    .insert(vaultItem)
    .values({
      spaceId: space.id,
      collectionId,
      kind: meta.isImage && stored ? "image" : "link",
      title:
        meta.title ?? (meta.isImage ? filenameOf(new URL(meta.url)) : (domainOf(meta.url) ?? "")),
      body: meta.description ?? "",
      url: meta.url,
      siteName: meta.siteName,
      iconUrl: meta.iconUrl,
      previewUrl: stored ? null : meta.imageUrl,
      asset: stored?.asset ?? null,
      colors: stored?.colors ?? [],
      tags: parsed.data.tags,
    })
    .returning();

  refresh();
  return { ok: true, item: toVaultItem(row!) };
}

export async function createNote(input: CreateNoteInput): Promise<VaultResult> {
  const parsed = createNoteInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { title, body, tags } = parsed.data;
  if (!title && !body.trim()) return invalid("Write something first.");
  const { space } = await requireSpace();
  const [row] = await db
    .insert(vaultItem)
    .values({
      spaceId: space.id,
      collectionId: await ownCollection(space.id, parsed.data.collectionId),
      kind: "note",
      title,
      body,
      tags,
    })
    .returning();
  refresh();
  return { ok: true, item: toVaultItem(row!) };
}

export async function createSnippet(input: CreateSnippetInput): Promise<VaultResult> {
  const parsed = createSnippetInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { title, body, tags } = parsed.data;
  const { space } = await requireSpace();
  const [row] = await db
    .insert(vaultItem)
    .values({
      spaceId: space.id,
      collectionId: await ownCollection(space.id, parsed.data.collectionId),
      kind: "snippet",
      title,
      body,
      language: parsed.data.language ?? guessLanguage(body),
      tags,
    })
    .returning();
  refresh();
  return { ok: true, item: toVaultItem(row!) };
}

/** Signed parameters for one direct upload from the browser to storage. */
export async function prepareUpload(input: {
  filename: string;
}): Promise<
  { ok: true; url: string; fields: Record<string, string> } | { ok: false; error: string }
> {
  if (!storageEnabled) return invalid("Uploads aren’t switched on yet.");
  const parsed = signUploadInput.safeParse(input);
  if (!parsed.success) return invalid();
  const { space } = await requireSpace();
  return { ok: true, ...signUpload(space.id, parsed.data.filename) };
}

const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "heic"]);

/** Records a finished upload once storage vouches for it. */
export async function createUpload(input: CreateUploadInput): Promise<VaultResult> {
  const parsed = createUploadInput.safeParse(input);
  if (!parsed.success) return invalid();
  const { publicId, version, signature, resourceType, filename, tags } = parsed.data;
  const { space } = await requireSpace();
  if (!verifyUpload(space.id, { publicId, version, signature })) {
    return invalid("That upload couldn’t be verified.");
  }
  const stored = await describeUpload(publicId, resourceType, filename);
  if (!stored) return invalid("That upload couldn’t be found. Please try again.");
  const { asset, colors } = stored;
  const image = asset.resourceType === "image" && IMAGE_FORMATS.has(asset.format ?? "");

  const [row] = await db
    .insert(vaultItem)
    .values({
      spaceId: space.id,
      collectionId: await ownCollection(space.id, parsed.data.collectionId),
      kind: image ? "image" : "file",
      title: filename.replace(/\.[a-z0-9]{1,8}$/i, ""),
      asset,
      colors: image ? colors : [],
      tags,
    })
    .returning();
  refresh();
  return { ok: true, item: toVaultItem(row!) };
}

export async function updateItem(input: UpdateItemInput): Promise<VaultResult> {
  const parsed = updateItemInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, collectionId, ...patch } = parsed.data;
  const { space } = await requireSpace();
  const values = {
    ...patch,
    ...(collectionId !== undefined && {
      collectionId: await ownCollection(space.id, collectionId),
    }),
  };
  if (Object.keys(values).length === 0) return invalid();

  const [row] = await db
    .update(vaultItem)
    .set(values)
    .where(and(eq(vaultItem.id, id), eq(vaultItem.spaceId, space.id), isNull(vaultItem.deletedAt)))
    .returning();
  if (!row) return invalid("That item no longer exists.");
  refresh();
  return { ok: true, item: toVaultItem(row) };
}

/** Removes files and rows of this space's items deleted long enough ago. */
async function purgeDeleted(spaceId: string) {
  const old = await db
    .delete(vaultItem)
    .where(
      and(
        eq(vaultItem.spaceId, spaceId),
        isNotNull(vaultItem.deletedAt),
        lt(vaultItem.deletedAt, sql`now() - make_interval(days => ${PURGE_AFTER_DAYS})`),
      ),
    )
    .returning({ asset: vaultItem.asset });
  await Promise.all(old.flatMap((r) => (r.asset ? [destroyAsset(r.asset as StoredAsset)] : [])));
}

/** Soft delete: undo restores it; the file goes in a later purge. */
export async function deleteItem(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();
  const [row] = await db
    .update(vaultItem)
    .set({ deletedAt: new Date() })
    .where(and(eq(vaultItem.id, id), eq(vaultItem.spaceId, space.id), isNull(vaultItem.deletedAt)))
    .returning({ id: vaultItem.id });
  if (!row) return invalid("That item is already gone.");
  after(() => purgeDeleted(space.id).catch(() => {}));
  refresh();
  return { ok: true };
}

export async function restoreItem(id: string): Promise<VaultResult> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();
  const [row] = await db
    .update(vaultItem)
    .set({ deletedAt: null })
    .where(and(eq(vaultItem.id, id), eq(vaultItem.spaceId, space.id)))
    .returning();
  if (!row) return invalid("That item can’t be restored anymore.");
  refresh();
  return { ok: true, item: toVaultItem(row) };
}

export async function createCollection(
  name: string,
): Promise<{ ok: true; collection: VaultCollection } | { ok: false; error: string }> {
  const parsed = collectionName.safeParse(name);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();
  const [last] = await db
    .select({ key: sql<string | null>`max(${collectionSortKey})` })
    .from(vaultCollection)
    .where(eq(vaultCollection.spaceId, space.id));
  const [row] = await db
    .insert(vaultCollection)
    .values({
      spaceId: space.id,
      name: parsed.data,
      sortKey: generateKeyBetween(last?.key ?? null, null),
    })
    .returning({ id: vaultCollection.id, name: vaultCollection.name });
  refresh();
  return { ok: true, collection: row! };
}

export async function renameCollection(id: string, name: string): Promise<ActionResult> {
  const parsed = collectionName.safeParse(name);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return invalid(parsed.error?.issues[0]?.message);
  }
  const { space } = await requireSpace();
  const [row] = await db
    .update(vaultCollection)
    .set({ name: parsed.data })
    .where(and(eq(vaultCollection.id, id), eq(vaultCollection.spaceId, space.id)))
    .returning({ id: vaultCollection.id });
  if (!row) return invalid("That collection no longer exists.");
  refresh();
  return { ok: true };
}

const collectionSnapshot = z.object({
  id: z.uuid(),
  name: collectionName,
  sortKey: z.string().min(1).max(200),
  itemIds: z.array(z.uuid()).max(5000),
});
export type CollectionSnapshot = z.infer<typeof collectionSnapshot>;

/** Its items stay in the Vault, unsorted. Returns what undo needs to put it back. */
export async function deleteCollection(
  id: string,
): Promise<{ ok: true; snapshot: CollectionSnapshot } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();
  const snapshot = await db.transaction(async (tx) => {
    const items = await tx
      .select({ id: vaultItem.id })
      .from(vaultItem)
      .where(and(eq(vaultItem.collectionId, id), eq(vaultItem.spaceId, space.id)));
    const [row] = await tx
      .delete(vaultCollection)
      .where(and(eq(vaultCollection.id, id), eq(vaultCollection.spaceId, space.id)))
      .returning();
    return (
      row && { id: row.id, name: row.name, sortKey: row.sortKey, itemIds: items.map((i) => i.id) }
    );
  });
  if (!snapshot) return invalid("That collection is already gone.");
  refresh();
  return { ok: true, snapshot };
}

export async function restoreCollection(input: CollectionSnapshot): Promise<ActionResult> {
  const parsed = collectionSnapshot.safeParse(input);
  if (!parsed.success) return invalid();
  const { id, name, sortKey, itemIds } = parsed.data;
  const { space } = await requireSpace();
  await db.transaction(async (tx) => {
    await tx
      .insert(vaultCollection)
      .values({ id, name, sortKey, spaceId: space.id })
      .onConflictDoNothing();
    const [own] = await tx
      .select({ id: vaultCollection.id })
      .from(vaultCollection)
      .where(and(eq(vaultCollection.id, id), eq(vaultCollection.spaceId, space.id)));
    if (own && itemIds.length) {
      await tx
        .update(vaultItem)
        .set({ collectionId: id })
        .where(
          and(
            inArray(vaultItem.id, itemIds),
            eq(vaultItem.spaceId, space.id),
            isNull(vaultItem.collectionId),
          ),
        );
    }
  });
  refresh();
  return { ok: true };
}
