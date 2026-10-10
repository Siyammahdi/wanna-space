import type { PageItem } from "./schema";

const byKey = (a: PageItem, b: PageItem) =>
  a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.id < b.id ? -1 : 1;

/** Children of each page (and of the root, under `null`), in sibling order. */
export function childrenMap(pages: PageItem[]): Map<string | null, PageItem[]> {
  const map = new Map<string | null, PageItem[]>();
  const ids = new Set(pages.map((p) => p.id));
  for (const p of pages) {
    // A parent that's gone (mid-delete) shouldn't hide the page.
    const parent = p.parentId && ids.has(p.parentId) ? p.parentId : null;
    const list = map.get(parent);
    if (list) list.push(p);
    else map.set(parent, [p]);
  }
  for (const list of map.values()) list.sort(byKey);
  return map;
}

/** Root first, the page itself excluded. */
export function ancestorsOf(pages: PageItem[], id: string): PageItem[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: PageItem[] = [];
  let at = byId.get(id)?.parentId ?? null;
  while (at && chain.length < 50) {
    const parent = byId.get(at);
    if (!parent) break;
    chain.unshift(parent);
    at = parent.parentId;
  }
  return chain;
}

/** The page and everything nested under it. */
export function subtreeIds(pages: PageItem[], id: string): string[] {
  const children = childrenMap(pages);
  const out: string[] = [];
  const walk = (at: string) => {
    out.push(at);
    for (const c of children.get(at) ?? []) walk(c.id);
  };
  walk(id);
  return out;
}

export const displayTitle = (title: string) => title.trim() || "Untitled";
