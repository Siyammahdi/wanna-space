"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { uuidv7 } from "@/lib/id";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { page, type Page } from "@/server/db/schema";

import {
  createPageInput,
  restorePagesInput,
  updatePageInput,
  type ActionResult,
  type CreatePageInput,
  type DeletedPage,
  type PageDoc,
  type UpdatePageInput,
} from "../schema";
import { extractText } from "../text";

const invalid = (error = "That didn’t look right. Please try again."): ActionResult<never> => ({
  ok: false,
  error,
});

async function ownsPage(spaceId: string, id: string) {
  const [row] = await db
    .select({ id: page.id })
    .from(page)
    .where(and(eq(page.id, id), eq(page.spaceId, spaceId)));
  return Boolean(row);
}

export async function createPage(input: CreatePageInput): Promise<ActionResult> {
  const parsed = createPageInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, parentId, title } = parsed.data;
  const { space } = await requireSpace();
  if (parentId && !(await ownsPage(space.id, parentId))) return invalid("That page is gone.");

  const [last] = await db
    .select({ key: sql<string | null>`max(${page.sortKey} collate "C")` })
    .from(page)
    .where(
      and(
        eq(page.spaceId, space.id),
        parentId ? eq(page.parentId, parentId) : isNull(page.parentId),
      ),
    );

  await db.insert(page).values({
    id,
    spaceId: space.id,
    parentId,
    title: title ?? "",
    sortKey: generateKeyBetween(last?.key ?? null, null),
  });
  refresh();
  return { ok: true };
}

/** A new top-level page, opened right away (for entry points outside the Notes room). */
export async function newPage(): Promise<void> {
  const id = uuidv7();
  const result = await createPage({ id, parentId: null });
  if (result.ok) redirect(`/notes/${id}` as Route);
}

/**
 * Title and icon changes refresh the tree; document saves don't (the editor already
 * shows them, and a refresh per keystroke burst would be wasted work).
 */
export async function updatePage(input: UpdatePageInput): Promise<ActionResult> {
  const parsed = updatePageInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, content, ...meta } = parsed.data;
  const { space } = await requireSpace();

  const patch: Partial<Page> = { ...meta };
  if (content) {
    patch.content = content as PageDoc;
    patch.excerpt = extractText(content);
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const updated = await db
    .update(page)
    .set(patch)
    .where(and(eq(page.id, id), eq(page.spaceId, space.id)))
    .returning({ id: page.id });
  if (updated.length === 0) return invalid("That page no longer exists.");
  if (meta.title !== undefined || meta.icon !== undefined) refresh();
  return { ok: true };
}

const snapshot = (p: Page): DeletedPage => ({
  id: p.id,
  parentId: p.parentId,
  title: p.title,
  icon: p.icon,
  content: (p.content as PageDoc | null) ?? null,
  excerpt: p.excerpt,
  sortKey: p.sortKey,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

/** Deletes the page and its subpages; returns them (parents first) so undo can restore them. */
export async function deletePage(id: string): Promise<ActionResult<DeletedPage[]>> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();

  const rows = await db.execute<{ id: string }>(sql`
    with recursive sub as (
      select id, 0 as depth from ${page} where id = ${id} and space_id = ${space.id}
      union all
      select p.id, sub.depth + 1 from ${page} p join sub on p.parent_id = sub.id
      where p.space_id = ${space.id} and sub.depth < 50
    )
    select id from sub order by depth
  `);
  const ids = rows.rows.map((r) => r.id);
  if (ids.length === 0) return invalid("That page no longer exists.");

  const full = await db
    .select()
    .from(page)
    .where(and(eq(page.spaceId, space.id), inArray(page.id, ids)));
  const order = new Map(ids.map((pid, i) => [pid, i]));
  full.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  await db.delete(page).where(and(eq(page.id, id), eq(page.spaceId, space.id)));
  refresh();
  return { ok: true, data: full.map(snapshot) };
}

/** Undo for deletePage: re-inserts the snapshots (parents first) in the caller's space. */
export async function restorePages(input: DeletedPage[]): Promise<ActionResult> {
  const parsed = restorePagesInput.safeParse(input);
  if (!parsed.success) return invalid();
  const { space } = await requireSpace();
  const rows = parsed.data;

  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) return invalid();
  const existing = await db
    .select({ id: page.id })
    .from(page)
    .where(inArray(page.id, [...ids]));
  if (existing.length > 0) return invalid("That page is already back.");

  const outside = [
    ...new Set(rows.flatMap((r) => (r.parentId && !ids.has(r.parentId) ? [r.parentId] : []))),
  ];
  const liveParents = new Set<string>();
  for (const parentId of outside) {
    if (await ownsPage(space.id, parentId)) liveParents.add(parentId);
  }

  await db.insert(page).values(
    rows.map(({ createdAt, updatedAt, parentId, content, ...rest }) => ({
      ...rest,
      spaceId: space.id,
      content,
      // The old parent may be gone in the meantime; the page comes back at the top level.
      parentId: parentId && (ids.has(parentId) || liveParents.has(parentId)) ? parentId : null,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    })),
  );
  refresh();
  return { ok: true };
}
