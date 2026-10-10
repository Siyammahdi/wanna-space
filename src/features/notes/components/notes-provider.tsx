"use client";

import { generateKeyBetween } from "fractional-indexing";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useOptimistic,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { recordUndo } from "@/components/shell/undo";
import { toast } from "@/components/ui/toast";
import { uuidv7 } from "@/lib/id";

import type { PageItem } from "../schema";
import { createPage, deletePage, restorePages, updatePage } from "../server/actions";
import { childrenMap, displayTitle, subtreeIds } from "../tree";

type Op =
  | { type: "add"; page: PageItem }
  | { type: "patch"; id: string; changes: Partial<PageItem> }
  | { type: "remove"; ids: string[] };

function reducer(pages: PageItem[], op: Op): PageItem[] {
  if (op.type === "add") return [...pages, op.page];
  if (op.type === "patch") return pages.map((p) => (p.id === op.id ? { ...p, ...op.changes } : p));
  const gone = new Set(op.ids);
  return pages.filter((p) => !gone.has(p.id));
}

type NotesState = {
  pages: PageItem[];
  currentId: string | null;
  /** Creates a page under `parentId` and (unless told not to) opens it. Resolves to its id. */
  create: (parentId: string | null, options?: { navigate?: boolean }) => Promise<string | null>;
  /** Saves a title or icon change, showing it everywhere at once. */
  saveMeta: (id: string, changes: { title?: string; icon?: string | null }) => Promise<boolean>;
  remove: (id: string) => void;
  isOpen: (id: string) => boolean;
  setOpen: (id: string, open: boolean) => void;
};

const NotesContext = createContext<NotesState | null>(null);

export function useNotes() {
  const ctx = use(NotesContext);
  if (!ctx) throw new Error("useNotes needs <NotesProvider>");
  return ctx;
}

/* Which tree branches are open, remembered per device. */
const OPEN_KEY = "ws-notes-open";
const OPEN_EVENT = "ws-notes-open";
const EMPTY = new Set<string>();
let openCache: { raw: string | null; set: Set<string> } = { raw: null, set: EMPTY };

function readOpen(): Set<string> {
  const raw = localStorage.getItem(OPEN_KEY);
  if (raw !== openCache.raw) {
    let ids: unknown = [];
    try {
      ids = JSON.parse(raw ?? "[]");
    } catch {}
    openCache = { raw, set: new Set(Array.isArray(ids) ? ids.map(String) : []) };
  }
  return openCache.set;
}

function subscribeOpen(onChange: () => void) {
  window.addEventListener(OPEN_EVENT, onChange);
  return () => window.removeEventListener(OPEN_EVENT, onChange);
}

export function openPages(ids: string[], open = true) {
  const next = new Set(readOpen());
  for (const id of ids) {
    if (open) next.add(id);
    else next.delete(id);
  }
  localStorage.setItem(OPEN_KEY, JSON.stringify([...next].slice(-500)));
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const pageHref = (id: string) => `/notes/${id}` as Route;

export function NotesProvider({
  pages: serverPages,
  children,
}: {
  pages: PageItem[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pages, apply] = useOptimistic(serverPages, reducer);
  const open = useSyncExternalStore(subscribeOpen, readOpen, () => EMPTY);
  const currentId = pathname.match(/^\/notes\/([0-9a-f-]{36})/)?.[1] ?? null;

  function create(parentId: string | null, { navigate = true } = {}) {
    const id = uuidv7();
    const siblings = childrenMap(pages).get(parentId) ?? [];
    const sortKey = generateKeyBetween(siblings.at(-1)?.sortKey ?? null, null);
    if (parentId) openPages([parentId]);
    return new Promise<string | null>((resolve) => {
      startTransition(async () => {
        apply({
          type: "add",
          page: {
            id,
            parentId,
            title: "",
            icon: null,
            sortKey,
            updatedAt: new Date().toISOString(),
          },
        });
        const result = await createPage({ id, parentId }).catch(() => null);
        if (!result?.ok) {
          toast({ id: "notes", message: result?.error ?? "Couldn’t create the page." });
          resolve(null);
          return;
        }
        if (navigate) router.push(pageHref(id));
        resolve(id);
      });
    });
  }

  function saveMeta(id: string, changes: { title?: string; icon?: string | null }) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        apply({ type: "patch", id, changes });
        const result = await updatePage({ id, ...changes }).catch(() => null);
        if (!result?.ok) toast({ id: "notes", message: result?.error ?? "Couldn’t save that." });
        resolve(Boolean(result?.ok));
      });
    });
  }

  function remove(id: string) {
    const target = pages.find((p) => p.id === id);
    if (!target) return;
    const ids = subtreeIds(pages, id);
    const leaving = currentId !== null && ids.includes(currentId);
    startTransition(async () => {
      apply({ type: "remove", ids });
      if (leaving) router.push(target.parentId ? pageHref(target.parentId) : "/notes");
      const result = await deletePage(id).catch(() => null);
      if (!result?.ok) {
        toast({ id: "notes", message: result?.error ?? "Couldn’t delete the page." });
        return;
      }
      const subpages = result.data.length - 1;
      recordUndo(
        {
          label: `“${displayTitle(target.title)}”`,
          undo: () =>
            startTransition(async () => {
              const restored = await restorePages(result.data);
              if (!restored.ok) toast({ id: "notes", message: restored.error });
            }),
          redo: () =>
            startTransition(async () => {
              await deletePage(id);
            }),
        },
        subpages > 0
          ? `Deleted with ${subpages} subpage${subpages === 1 ? "" : "s"}`
          : "Page deleted",
      );
    });
  }

  const value: NotesState = {
    pages,
    currentId,
    create,
    saveMeta,
    remove,
    isOpen: (id) => open.has(id),
    setOpen: (id, next) => openPages([id], next),
  };

  return <NotesContext value={value}>{children}</NotesContext>;
}
