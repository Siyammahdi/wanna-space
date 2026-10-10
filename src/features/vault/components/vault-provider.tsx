"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { createContext, use, useMemo, useRef, useState, type ReactNode } from "react";

import { recordUndo } from "@/components/shell/undo";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/lib/upload";

import {
  applyFilters,
  filtersToQuery,
  itemLabel,
  matchesQuery,
  type VaultFilters,
} from "../filters";
import {
  MAX_UPLOAD_BYTES,
  type UpdateItemInput,
  type VaultCollection,
  type VaultItem,
} from "../schema";
import * as actions from "../server/actions";

/** A card for something still on its way in: a link being fetched, a file uploading. */
export type PendingItem = {
  id: string;
  kind: "link" | "upload";
  label: string;
  /** Upload progress 0–1; null while there's nothing to measure. */
  progress: number | null;
  /** A local preview of an image being uploaded. */
  image: string | null;
};

export type ItemPatch = Omit<UpdateItemInput, "id">;

export type ComposerState = {
  mode: "note" | "snippet";
  title: string;
  body: string;
  language: string | null;
};

type VaultContextValue = {
  /** Everything loaded, newest first, with local changes applied. */
  items: VaultItem[];
  /** The items the current filters let through. */
  shown: VaultItem[];
  collections: VaultCollection[];
  pending: PendingItem[];
  filters: VaultFilters;
  setFilters: (patch: Partial<VaultFilters>) => void;
  /** Where new items land: the open collection and tag. */
  target: { collectionId: string | null; tags: string[] };
  uploadsEnabled: boolean;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  composer: ComposerState | null;
  setComposer: (next: ComposerState | null) => void;
  saveLink: (url: string) => Promise<boolean>;
  createNote: (input: { title: string; body: string }) => Promise<boolean>;
  createSnippet: (input: {
    title: string;
    body: string;
    language: string | null;
  }) => Promise<boolean>;
  upload: (files: File[]) => void;
  update: (id: string, patch: ItemPatch, options?: { announce?: string }) => Promise<void>;
  remove: (item: VaultItem) => void;
  createCollection: (name: string) => Promise<string | null>;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (collection: VaultCollection) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault() {
  const value = use(VaultContext);
  if (!value) throw new Error("useVault must be used inside <VaultProvider>");
  return value;
}

const UPLOAD_CONCURRENCY = 3;
let tempSeq = 0;
const tempId = (prefix: string) => `${prefix}-${++tempSeq}`;

const hostLabel = (raw: string) => {
  try {
    return new URL(/^[a-z]+:/i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
};

const without = <T,>(record: Record<string, T>, key: string) => {
  const next = { ...record };
  delete next[key];
  return next;
};

export function VaultProvider({
  initialItems,
  initialCollections,
  initialFilters,
  uploadsEnabled,
  linkedId,
  children,
}: {
  initialItems: VaultItem[];
  initialCollections: VaultCollection[];
  initialFilters: VaultFilters;
  uploadsEnabled: boolean;
  /** From `?item=` (e.g. a command palette result): open this item. */
  linkedId: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Newer copies of items from this tab's own actions (created, edited, restored).
  const [local, setLocal] = useState<Record<string, VaultItem>>({});
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  // Edits on their way to the server, with a sequence so only the latest one clears.
  const [patches, setPatches] = useState<Record<string, { seq: number; values: ItemPatch }>>({});
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [collections, setCollections] = useState(initialCollections);
  const [filters, setFilterState] = useState(initialFilters);
  const [openId, setOpenState] = useState<string | null>(linkedId);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [seen, setSeen] = useState({ items: initialItems, collections: initialCollections });
  const [seenLinked, setSeenLinked] = useState(linkedId);
  const patchSeq = useRef(0);

  if (linkedId !== seenLinked) {
    setSeenLinked(linkedId);
    if (linkedId) setOpenState(linkedId);
  }

  if (seen.items !== initialItems || seen.collections !== initialCollections) {
    setSeen({ items: initialItems, collections: initialCollections });
    if (seen.collections !== initialCollections) setCollections(initialCollections);
    if (seen.items !== initialItems) {
      const server = new Map(initialItems.map((i) => [i.id, i]));
      setLocal((current) => {
        const next: Record<string, VaultItem> = {};
        for (const [id, item] of Object.entries(current)) {
          const s = server.get(id);
          if (!s || item.updatedAt > s.updatedAt) next[id] = item;
        }
        return next;
      });
      setRemoved((current) => new Set([...current].filter((id) => server.has(id))));
    }
  }

  const items = useMemo(() => {
    const known = new Set(collections.map((c) => c.id));
    const byId = new Map(initialItems.map((i) => [i.id, i]));
    for (const [id, item] of Object.entries(local)) {
      const s = byId.get(id);
      if (!s || item.updatedAt > s.updatedAt) byId.set(id, item);
    }
    return [...byId.values()]
      .filter((i) => !removed.has(i.id))
      .map((i) => {
        const patched = patches[i.id] ? ({ ...i, ...patches[i.id]!.values } as VaultItem) : i;
        return patched.collectionId && !known.has(patched.collectionId)
          ? { ...patched, collectionId: null }
          : patched;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }, [initialItems, local, removed, patches, collections]);

  const activeFilters = useMemo(
    () =>
      filters.collection === "all" ||
      filters.collection === "unsorted" ||
      collections.some((c) => c.id === filters.collection)
        ? filters
        : { ...filters, collection: "all" },
    [filters, collections],
  );
  const shown = useMemo(() => applyFilters(items, activeFilters), [items, activeFilters]);

  const target = {
    collectionId: collections.some((c) => c.id === activeFilters.collection)
      ? activeFilters.collection
      : null,
    tags: activeFilters.tag ? [activeFilters.tag] : [],
  };

  function setFilters(patch: Partial<VaultFilters>) {
    const next = { ...activeFilters, ...patch };
    setFilterState(next);
    window.history.replaceState(null, "", `${window.location.pathname}${filtersToQuery(next)}`);
  }

  /** Closing an item that came from a link drops `?item=`, so the link works again. */
  function setOpenId(id: string | null) {
    setOpenState(id);
    if (!id && linkedId) {
      router.replace(`${pathname}${filtersToQuery(activeFilters)}` as Route, { scroll: false });
    }
  }

  const keep = (item: VaultItem) => {
    setLocal((l) => ({ ...l, [item.id]: item }));
    setRemoved((r) => {
      if (!r.has(item.id)) return r;
      const next = new Set(r);
      next.delete(item.id);
      return next;
    });
  };
  const hide = (id: string) => {
    setRemoved((r) => new Set(r).add(id));
    setLocal((l) => (l[id] ? without(l, id) : l));
  };

  /** Deleting and restoring by undo/redo, keeping this tab's view in step. */
  const undoable = (item: VaultItem) => ({
    undo: () => {
      hide(item.id);
      void actions.deleteItem(item.id);
    },
    redo: () => {
      void actions.restoreItem(item.id).then((r) => r.ok && keep(r.item));
    },
  });

  /** Confirms a new item, and offers to clear filters that would hide it. */
  function announceNew(item: VaultItem, message: string) {
    const visible =
      (!activeFilters.kind || activeFilters.kind === item.kind) &&
      matchesQuery(item, activeFilters.q);
    const label = itemLabel(item);
    if (visible) {
      recordUndo({ label, ...undoable(item) }, message);
      return;
    }
    recordUndo({ label, ...undoable(item) });
    toast({
      message,
      detail: "Hidden by your filters",
      action: {
        label: "Show",
        onAction: () => setFilters({ kind: null, q: "", tag: target.tags[0] ?? null }),
      },
    });
  }

  async function saveLink(url: string) {
    const id = tempId("link");
    setPending((p) => [
      { id, kind: "link", label: hostLabel(url), progress: null, image: null },
      ...p,
    ]);
    const result = await actions
      .saveLink({ url, ...target })
      .catch(() => ({ ok: false as const, error: "Couldn’t save that link. Please try again." }));
    setPending((p) => p.filter((x) => x.id !== id));
    if (!result.ok) {
      toast({ message: result.error });
      return false;
    }
    keep(result.item);
    if ("existing" in result && result.existing) {
      toast({
        message: "Already in your Vault",
        detail: itemLabel(result.item),
        action: { label: "Open", onAction: () => setOpenId(result.item.id) },
      });
    } else {
      announceNew(result.item, "Link saved");
    }
    return true;
  }

  async function createNote(input: { title: string; body: string }) {
    const result = await actions
      .createNote({ ...input, ...target })
      .catch(() => ({ ok: false as const, error: "Couldn’t save that note. Please try again." }));
    if (!result.ok) {
      toast({ message: result.error });
      return false;
    }
    keep(result.item);
    announceNew(result.item, "Note saved");
    return true;
  }

  async function createSnippet(input: { title: string; body: string; language: string | null }) {
    const result = await actions.createSnippet({ ...input, ...target }).catch(() => ({
      ok: false as const,
      error: "Couldn’t save that snippet. Please try again.",
    }));
    if (!result.ok) {
      toast({ message: result.error });
      return false;
    }
    keep(result.item);
    announceNew(result.item, "Snippet saved");
    return true;
  }

  async function uploadOne(file: File, into: typeof target) {
    const id = tempId("upload");
    const image = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const setProgress = (progress: number) =>
      setPending((p) => p.map((x) => (x.id === id ? { ...x, progress } : x)));
    setPending((p) => [{ id, kind: "upload", label: file.name, progress: 0, image }, ...p]);
    try {
      const signed = await actions.prepareUpload({ filename: file.name });
      if (!signed.ok) throw new Error(signed.error);
      const response = await uploadFile(signed, file, setProgress);
      setProgress(1);
      const result = await actions.createUpload({
        publicId: response.public_id,
        version: response.version,
        signature: response.signature,
        resourceType: response.resource_type,
        filename: file.name,
        ...into,
      });
      if (!result.ok) throw new Error(result.error);
      keep(result.item);
      return result.item;
    } catch (error) {
      toast({
        message: `Couldn’t upload ${file.name}`,
        detail:
          error instanceof Error && error.message !== "Upload failed" ? error.message : undefined,
      });
      return null;
    } finally {
      setPending((p) => p.filter((x) => x.id !== id));
      if (image) URL.revokeObjectURL(image);
    }
  }

  function upload(files: File[]) {
    if (!uploadsEnabled) {
      toast({
        message: "Uploads aren’t switched on yet",
        detail: "Links, notes and snippets work.",
      });
      return;
    }
    const tooBig = files.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const queue = files.filter((f) => f.size > 0 && f.size <= MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      toast({
        message:
          tooBig.length === 1
            ? `${tooBig[0]!.name} is too big`
            : `${tooBig.length} files are too big`,
        detail: "Files can be up to 10 MB.",
      });
    }
    if (!queue.length) return;
    const into = target;
    const saved: VaultItem[] = [];
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        const item = await uploadOne(file, into);
        if (item) saved.push(item);
      }
    };
    const total = queue.length;
    void Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, worker)).then(
      () => {
        if (saved.length === 1) announceNew(saved[0]!, "Uploaded");
        else if (saved.length > 1) toast({ message: `${saved.length} files uploaded` });
      },
    );
  }

  /** Shows the edit at once, then saves it; true once the server has it. */
  async function send(id: string, patch: ItemPatch) {
    const seq = ++patchSeq.current;
    setPatches((p) => ({ ...p, [id]: { seq, values: { ...p[id]?.values, ...patch } } }));
    const result = await actions
      .updateItem({ id, ...patch })
      .catch(() => ({ ok: false as const, error: "Couldn’t save that change." }));
    setPatches((p) => (p[id]?.seq === seq ? without(p, id) : p));
    if (!result.ok) {
      toast({ message: result.error });
      return false;
    }
    keep(result.item);
    return true;
  }

  async function update(id: string, patch: ItemPatch, options: { announce?: string } = {}) {
    const before = items.find((i) => i.id === id);
    if (!before || !(await send(id, patch))) return;
    const inverse = Object.fromEntries(
      Object.keys(patch).map((key) => [key, before[key as keyof ItemPatch]]),
    ) as ItemPatch;
    recordUndo(
      {
        label: itemLabel(before),
        undo: () => void send(id, inverse),
        redo: () => void send(id, patch),
      },
      options.announce,
    );
  }

  function remove(item: VaultItem) {
    hide(item.id);
    if (openId === item.id) setOpenId(null);
    void actions
      .deleteItem(item.id)
      .catch(() => ({ ok: false as const, error: "Couldn’t delete that. Please try again." }))
      .then((result) => {
        if (!result.ok) {
          keep(item);
          toast({ message: result.error });
          return;
        }
        recordUndo(
          {
            label: itemLabel(item),
            undo: () => void actions.restoreItem(item.id).then((r) => r.ok && keep(r.item)),
            redo: () => {
              hide(item.id);
              void actions.deleteItem(item.id);
            },
          },
          "Deleted",
        );
      });
  }

  async function createCollection(name: string) {
    const result = await actions
      .createCollection(name)
      .catch(() => ({ ok: false as const, error: "Couldn’t create that collection." }));
    if (!result.ok) {
      toast({ message: result.error });
      return null;
    }
    setCollections((c) =>
      c.some((x) => x.id === result.collection.id) ? c : [...c, result.collection],
    );
    return result.collection.id;
  }

  function renameCollection(id: string, name: string) {
    const before = collections;
    setCollections((c) => c.map((x) => (x.id === id ? { ...x, name } : x)));
    void actions.renameCollection(id, name).then((result) => {
      if (!result.ok) {
        setCollections(before);
        toast({ message: result.error });
      }
    });
  }

  function deleteCollection(collection: VaultCollection) {
    setCollections((c) => c.filter((x) => x.id !== collection.id));
    if (activeFilters.collection === collection.id) setFilters({ collection: "all" });
    void actions.deleteCollection(collection.id).then((result) => {
      if (!result.ok) {
        setCollections((c) => [...c, collection]);
        toast({ message: result.error });
        return;
      }
      const { snapshot } = result;
      recordUndo(
        {
          label: collection.name,
          undo: () => {
            setCollections((c) => [...c, collection]);
            void actions.restoreCollection(snapshot);
          },
          redo: () => {
            setCollections((c) => c.filter((x) => x.id !== collection.id));
            void actions.deleteCollection(collection.id);
          },
        },
        "Collection deleted",
      );
    });
  }

  return (
    <VaultContext
      value={{
        items,
        shown,
        collections,
        pending,
        filters: activeFilters,
        setFilters,
        target,
        uploadsEnabled,
        openId,
        setOpenId,
        composer,
        setComposer,
        saveLink,
        createNote,
        createSnippet,
        upload,
        update,
        remove,
        createCollection,
        renameCollection,
        deleteCollection,
      }}
    >
      {children}
    </VaultContext>
  );
}
