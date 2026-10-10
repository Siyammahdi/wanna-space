import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Route } from "next";

import type { PaletteResult } from "@/components/shell/command-palette";
import { containsPattern, hasAll, snippet } from "@/lib/search";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { page } from "@/server/db/schema";

import { displayTitle } from "../tree";

/**
 * Every text node of a page's document, joined by spaces. Read at query time, so it's
 * always current; a space has hundreds of pages, not millions.
 */
const pageText = sql<string>`array_to_string(array(select jsonb_array_elements_text(jsonb_path_query_array(${page.content}, 'strict $.** ? (@.type == "text").text'))), ' ')`;

/** Pages whose title or text contains every word, title matches and recent edits first. */
export async function searchPages(words: string[], limit = 5): Promise<PaletteResult[]> {
  const { space } = await requireSpace();
  const parent = alias(page, "parent");
  const docs = db
    .select({
      id: page.id,
      title: page.title,
      icon: page.icon,
      updatedAt: page.updatedAt,
      parentTitle: sql<string | null>`${parent.title}`.as("parent_title"),
      text: pageText.as("text"),
    })
    .from(page)
    .leftJoin(parent, eq(parent.id, page.parentId))
    .where(eq(page.spaceId, space.id))
    .as("docs");
  const patterns = words.map(containsPattern);

  const rows = await db
    .select()
    .from(docs)
    .where(and(...patterns.map((p) => or(ilike(docs.title, p), ilike(docs.text, p)))))
    .orderBy(sql`(${and(...patterns.map((p) => ilike(docs.title, p)))}) desc`, desc(docs.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    group: "Pages",
    label: displayTitle(r.title),
    hint: r.parentTitle !== null ? `In ${displayTitle(r.parentTitle)}` : "Page",
    snippet: hasAll(r.title, words) ? undefined : snippet(r.text, words),
    href: `/notes/${r.id}` as Route,
    glyph: "page",
    emoji: r.icon,
  }));
}
