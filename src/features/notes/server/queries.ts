import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { page } from "@/server/db/schema";

import type { PageDoc, PageItem, PageWithContent, RecentPage } from "../schema";

/** Fractional keys must compare byte-wise, not by locale. */
export const pageSortKey = sql`${page.sortKey} collate "C"`;

const treeColumns = {
  id: page.id,
  parentId: page.parentId,
  title: page.title,
  icon: page.icon,
  sortKey: page.sortKey,
  updatedAt: page.updatedAt,
};

type TreeRow = { [K in keyof typeof treeColumns]: (typeof page.$inferSelect)[K] };

const toItem = (r: TreeRow): PageItem => ({ ...r, updatedAt: r.updatedAt.toISOString() });

/** Every page in the space, without documents: enough for the tree and links. */
export const listPages = cache(async (): Promise<PageItem[]> => {
  const { space } = await requireSpace();
  const rows = await db
    .select(treeColumns)
    .from(page)
    .where(eq(page.spaceId, space.id))
    .orderBy(pageSortKey);
  return rows.map(toItem);
});

export const getPage = cache(async (id: string): Promise<PageWithContent | null> => {
  if (!z.uuid().safeParse(id).success) return null;
  const { space } = await requireSpace();
  const [row] = await db
    .select({ ...treeColumns, content: page.content })
    .from(page)
    .where(and(eq(page.id, id), eq(page.spaceId, space.id)));
  if (!row) return null;
  return { ...toItem(row), content: (row.content as PageDoc | null) ?? null };
});

export async function listRecentPages(limit = 8): Promise<RecentPage[]> {
  const { space } = await requireSpace();
  const rows = await db
    .select({ ...treeColumns, excerpt: page.excerpt })
    .from(page)
    .where(eq(page.spaceId, space.id))
    .orderBy(desc(page.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ ...toItem(r), excerpt: r.excerpt }));
}
