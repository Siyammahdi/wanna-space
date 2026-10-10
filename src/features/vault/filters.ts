import { languageName } from "./language";
import { VAULT_KINDS, type VaultItem, type VaultKind } from "./schema";

/** What the board shows; mirrored in the URL (`?c=&kind=&tag=&q=`). */
export type VaultFilters = {
  /** "all", "unsorted", or a collection id. */
  collection: string;
  kind: VaultKind | null;
  tag: string | null;
  q: string;
};

export const NO_FILTERS: VaultFilters = { collection: "all", kind: null, tag: null, q: "" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function filtersFromParams(params: Params): VaultFilters {
  const kind = one(params.kind);
  return {
    collection: one(params.c) || "all",
    kind: (VAULT_KINDS as readonly string[]).includes(kind) ? (kind as VaultKind) : null,
    tag: one(params.tag).slice(0, 32) || null,
    q: one(params.q).slice(0, 100),
  };
}

export function filtersToQuery(f: VaultFilters) {
  const params = new URLSearchParams();
  if (f.collection !== "all") params.set("c", f.collection);
  if (f.kind) params.set("kind", f.kind);
  if (f.tag) params.set("tag", f.tag);
  if (f.q.trim()) params.set("q", f.q.trim());
  const query = params.toString();
  return query ? `?${query}` : "";
}

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

const haystack = (item: VaultItem) =>
  fold(
    [
      item.title,
      item.body,
      item.url,
      item.siteName,
      item.file?.name,
      languageName(item.language),
      ...item.tags.map((t) => `#${t}`),
    ]
      .filter(Boolean)
      .join(" "),
  );

/** Every word of the query must appear somewhere in the item. */
export function matchesQuery(item: VaultItem, q: string) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(item);
  return words.every((w) => text.includes(w));
}

export function applyFilters(items: VaultItem[], f: VaultFilters) {
  return items.filter(
    (item) =>
      (f.collection === "all" ||
        (f.collection === "unsorted"
          ? item.collectionId === null
          : item.collectionId === f.collection)) &&
      (!f.kind || item.kind === f.kind) &&
      (!f.tag || item.tags.includes(f.tag)) &&
      matchesQuery(item, f.q),
  );
}

/** Tags in use, most used first. */
export function tagCounts(items: VaultItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) for (const t of item.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Width ÷ height of a card's preview: share images sit in the usual 1.91:1 frame; images
 * and files keep their own shape, cropped at 1:1.6 so a tall one can't take a column.
 */
export function previewRatio(item: VaultItem) {
  const p = item.preview;
  if (!p || item.kind === "link" || !p.width || !p.height) return 1.91;
  return Math.max(1 / 1.6, Math.min(3, p.width / p.height));
}

/**
 * A card's rough height for a column `width` px wide, so cards can be dealt into
 * columns newest-first (left to right) without measuring them.
 */
export function estimateHeight(item: VaultItem, width: number) {
  const chars = Math.max(12, width / 7.4);
  const lines = (text: string, max: number) =>
    Math.min(
      max,
      text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / chars)), 0),
    );
  const tags = item.tags.length ? 26 : 0;
  const preview = item.preview ? width / previewRatio(item) : 0;

  switch (item.kind) {
    case "image":
      return preview || width * 0.75;
    case "link":
      return (
        preview + 64 + lines(item.title, 2) * 19 + (item.body ? lines(item.body, 2) * 17 : 0) + tags
      );
    case "file":
      return (preview || 120) + 62 + tags;
    case "snippet":
      return 54 + (item.title ? 20 : 0) + Math.min(12, item.body.split("\n").length) * 18 + tags;
    case "note":
      return 36 + (item.title ? 24 : 0) + lines(item.body, 9) * 20 + tags;
  }
}

/** Deals items into `count` columns, each to the currently shortest one. */
export function masonry<T>(items: T[], count: number, height: (item: T) => number) {
  const columns = Array.from({ length: count }, () => ({ items: [] as T[], height: 0 }));
  for (const item of items) {
    let target = columns[0]!;
    for (const c of columns) if (c.height < target.height - 1) target = c;
    target.items.push(item);
    target.height += height(item) + 16;
  }
  return columns.map((c) => c.items);
}

/** What to call an item: its title, else the site, the file, or a note's first line. */
export function itemLabel(item: VaultItem) {
  const firstLine = item.body.trim().split("\n")[0]?.trim() ?? "";
  return (
    item.title ||
    (item.kind === "note" || item.kind === "snippet"
      ? firstLine.slice(0, 80)
      : item.domain || item.file?.name) ||
    "Untitled"
  );
}

export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
