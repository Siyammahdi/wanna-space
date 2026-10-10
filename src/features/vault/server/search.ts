import "server-only";

import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Route } from "next";

import type { PaletteResult } from "@/components/shell/command-palette";
import { containsPattern, hasAll, snippet } from "@/lib/search";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { vaultCollection, vaultItem } from "@/server/db/schema";

import { languageName } from "../language";
import type { VaultKind } from "../schema";
import { domainOf } from "./queries";

const KIND_LABEL: Record<VaultKind, string> = {
  link: "Link",
  image: "Image",
  file: "File",
  snippet: "Snippet",
  note: "Note",
};

const GLYPH = {
  link: "link",
  image: "image",
  file: "file",
  snippet: "code",
  note: "note",
} as const satisfies Record<VaultKind, PaletteResult["glyph"]>;

/** Everything a search can find an item by: words, its address, the file, its tags. */
const haystack = sql<string>`concat_ws(' ', ${vaultItem.title}, ${vaultItem.body}, ${vaultItem.url}, ${vaultItem.siteName}, ${vaultItem.asset} ->> 'filename', array_to_string(${vaultItem.tags}, ' '))`;

/** Vault items containing every word, title matches and newest first. */
export async function searchVault(words: string[], limit = 5): Promise<PaletteResult[]> {
  const { space } = await requireSpace();
  const patterns = words.map(containsPattern);

  const rows = await db
    .select({
      id: vaultItem.id,
      kind: vaultItem.kind,
      title: vaultItem.title,
      body: vaultItem.body,
      url: vaultItem.url,
      siteName: vaultItem.siteName,
      language: vaultItem.language,
      filename: sql<string | null>`${vaultItem.asset} ->> 'filename'`,
      tags: vaultItem.tags,
      collection: vaultCollection.name,
    })
    .from(vaultItem)
    .leftJoin(vaultCollection, eq(vaultCollection.id, vaultItem.collectionId))
    .where(
      and(
        eq(vaultItem.spaceId, space.id),
        isNull(vaultItem.deletedAt),
        ...patterns.map((p) => sql`${haystack} ilike ${p}`),
      ),
    )
    .orderBy(
      sql`(${and(...patterns.map((p) => ilike(vaultItem.title, p)))}) desc`,
      desc(vaultItem.createdAt),
    )
    .limit(limit);

  return rows.map((r) => {
    const domain = domainOf(r.url);
    const firstLine = r.body.trim().split("\n")[0]?.trim().slice(0, 80);
    const label =
      r.title ||
      ((r.kind === "note" || r.kind === "snippet") && firstLine) ||
      domain ||
      r.filename ||
      "Untitled";
    const detail =
      r.kind === "link"
        ? (r.siteName ?? domain)
        : r.kind === "snippet"
          ? languageName(r.language)
          : null;
    const where = [r.body, r.url, r.filename, r.tags.map((t) => `#${t}`).join(" ")];
    return {
      id: r.id,
      group: "Vault",
      label,
      hint: [KIND_LABEL[r.kind], detail, r.collection].filter(Boolean).join(" · "),
      snippet: hasAll(label, words)
        ? undefined
        : where.map((text) => snippet(text, words)).find(Boolean),
      href: `/vault?item=${r.id}` as Route,
      glyph: GLYPH[r.kind],
    } satisfies PaletteResult;
  });
}
