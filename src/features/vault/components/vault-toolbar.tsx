"use client";

import {
  Code2,
  FileText,
  Hash,
  Image as ImageIcon,
  Inbox,
  Layers,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";
import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";

import { applyFilters, tagCounts } from "../filters";
import type { VaultCollection, VaultKind } from "../schema";
import { useVault } from "./vault-provider";

export const KIND_META: Record<VaultKind, { label: string; plural: string; icon: LucideIcon }> = {
  link: { label: "Link", plural: "Links", icon: Link2 },
  image: { label: "Image", plural: "Images", icon: ImageIcon },
  file: { label: "File", plural: "Files", icon: FileText },
  snippet: { label: "Snippet", plural: "Snippets", icon: Code2 },
  note: { label: "Note", plural: "Notes", icon: StickyNote },
};

export function VaultToolbar() {
  return (
    <div className="mt-5 mb-6 flex flex-col gap-3">
      <CollectionNav />
      <FilterRow />
    </div>
  );
}

function CollectionNav() {
  const { items, collections, filters, setFilters, createCollection } = useVault();
  const [creating, setCreating] = useState(false);
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.collectionId ?? "unsorted";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  async function create(name: string) {
    setCreating(false);
    if (!name) return;
    const id = await createCollection(name);
    if (id) setFilters({ collection: id });
  }

  return (
    <nav
      aria-label="Collections"
      className="-mx-1 flex [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 py-0.5"
    >
      <Pill
        active={filters.collection === "all"}
        icon={<Layers />}
        count={items.length}
        onSelect={() => setFilters({ collection: "all" })}
      >
        All
      </Pill>
      {collections.length > 0 && (
        <Pill
          active={filters.collection === "unsorted"}
          icon={<Inbox />}
          count={counts.get("unsorted") ?? 0}
          onSelect={() => setFilters({ collection: "unsorted" })}
        >
          Unsorted
        </Pill>
      )}
      {collections.length > 0 && <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />}
      {collections.map((c) => (
        <CollectionPill
          key={c.id}
          collection={c}
          count={counts.get(c.id) ?? 0}
          active={filters.collection === c.id}
        />
      ))}
      {creating ? (
        <NameInput initial="" label="New collection name" onDone={create} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Plus className="size-3.5" />
          New collection
        </button>
      )}
    </nav>
  );
}

function Pill({
  active,
  icon,
  count,
  onSelect,
  onContextMenu,
  trailing,
  children,
}: {
  active: boolean;
  icon?: ReactNode;
  count: number;
  onSelect: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex h-8 shrink-0 items-center rounded-full"
      onContextMenu={onContextMenu}
    >
      {active && (
        <motion.span
          layoutId="vault-collection-active"
          transition={spring.glide}
          className="absolute inset-0 rounded-full bg-surface-raised"
        />
      )}
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          "relative flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors [&_svg]:size-3.5",
          active ? "text-ink" : "text-ink-muted hover:bg-surface-hover/60 hover:text-ink",
          trailing && active && "pr-1.5",
        )}
      >
        {icon && <span className="flex items-center">{icon}</span>}
        <span className="max-w-40 truncate">{children}</span>
        {count > 0 && <span className="text-[11.5px] text-ink-faint tabular-nums">{count}</span>}
      </button>
      {active && trailing}
    </div>
  );
}

function CollectionPill({
  collection,
  count,
  active,
}: {
  collection: VaultCollection;
  count: number;
  active: boolean;
}) {
  const { setFilters, renameCollection, deleteCollection } = useVault();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);

  if (renaming) {
    return (
      <NameInput
        initial={collection.name}
        label="Collection name"
        onDone={(name) => {
          setRenaming(false);
          if (name && name !== collection.name) renameCollection(collection.id, name);
        }}
      />
    );
  }

  return (
    <Pill
      active={active}
      count={count}
      onSelect={() => setFilters({ collection: collection.id })}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!active) setFilters({ collection: collection.id });
        setMenu(true);
      }}
      trailing={
        <Popover
          open={menu}
          onOpenChange={setMenu}
          label={`${collection.name} options`}
          align="start"
          trigger={
            <button
              type="button"
              aria-label={`${collection.name} options`}
              aria-haspopup="dialog"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
              className="relative mr-1 flex size-6 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          }
        >
          <MenuItem
            icon={<Pencil />}
            onSelect={() => {
              setMenu(false);
              setRenaming(true);
            }}
          >
            Rename
          </MenuItem>
          <MenuGap />
          <MenuItem
            icon={<Trash2 />}
            tone="danger"
            onSelect={() => {
              setMenu(false);
              deleteCollection(collection);
            }}
          >
            Delete collection
          </MenuItem>
          <p className="px-2.5 pt-1 pb-1.5 text-[11.5px] leading-snug text-ink-faint">
            Its items stay in your Vault, unsorted.
          </p>
        </Popover>
      }
    >
      {collection.name}
    </Pill>
  );
}

function NameInput({
  initial,
  label,
  onDone,
}: {
  initial: string;
  label: string;
  onDone: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (name: string) => {
    if (done.current) return;
    done.current = true;
    onDone(name.trim());
  };
  return (
    <input
      autoFocus
      value={value}
      maxLength={60}
      aria-label={label}
      placeholder="Collection name"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(value);
        if (e.key === "Escape") {
          e.stopPropagation();
          finish(initial === "" ? "" : initial);
        }
      }}
      onBlur={() => finish(value)}
      className="h-8 w-44 shrink-0 rounded-full bg-surface-raised px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}

function FilterRow() {
  const { items, filters, setFilters } = useVault();
  const [tagsOpen, setTagsOpen] = useState(false);
  const inCollection = applyFilters(items, { ...filters, kind: null, tag: null, q: "" });
  const kindCounts = new Map<VaultKind, number>();
  for (const item of inCollection) kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + 1);
  const tags = tagCounts(inCollection);
  const kinds = (Object.keys(KIND_META) as VaultKind[]).filter(
    (k) => (kindCounts.get(k) ?? 0) > 0 || filters.kind === k,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div
        role="group"
        aria-label="Show only"
        className="-mx-1 flex min-w-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1"
      >
        {kinds.length > 1 &&
          kinds.map((kind) => {
            const { plural, icon: Icon } = KIND_META[kind];
            const active = filters.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ kind: active ? null : kind })}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-[color,background-color,transform] active:scale-95",
                  active
                    ? "bg-room-vault-soft text-room-vault"
                    : "bg-surface-sunken/70 text-ink-muted hover:bg-surface-hover hover:text-ink",
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} />
                {plural}
                <span
                  className={cn("tabular-nums", active ? "text-room-vault/70" : "text-ink-faint")}
                >
                  {kindCounts.get(kind) ?? 0}
                </span>
              </button>
            );
          })}

        {filters.tag ? (
          <button
            type="button"
            onClick={() => setFilters({ tag: null })}
            aria-label={`Remove tag filter ${filters.tag}`}
            className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-room-vault-soft pr-1.5 pl-2.5 text-[12.5px] font-medium text-room-vault transition-transform active:scale-95"
          >
            #{filters.tag}
            <X className="size-3.5" />
          </button>
        ) : (
          tags.length > 0 && (
            <Popover
              open={tagsOpen}
              onOpenChange={setTagsOpen}
              label="Filter by tag"
              align="start"
              className="max-h-80 w-56 overflow-y-auto"
              trigger={
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={tagsOpen}
                  onClick={() => setTagsOpen(!tagsOpen)}
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-surface-sunken/70 px-2.5 text-[12.5px] font-medium text-ink-muted transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-95"
                >
                  <Hash className="size-3.5" strokeWidth={2} />
                  Tags
                </button>
              }
            >
              {tags.map((t) => (
                <MenuItem
                  key={t.name}
                  icon={<Hash />}
                  hint={t.count}
                  onSelect={() => {
                    setTagsOpen(false);
                    setFilters({ tag: t.name });
                  }}
                >
                  {t.name}
                </MenuItem>
              ))}
            </Popover>
          )
        )}
      </div>
      <SearchField value={filters.q} onChange={(q) => setFilters({ q })} />
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className="group relative ml-auto flex h-9 w-full items-center gap-2 rounded-md bg-surface-sunken/70 px-3 transition-colors focus-within:bg-surface-sunken hover:bg-surface-sunken sm:w-64">
      <Search className="size-4 shrink-0 text-ink-subtle" strokeWidth={2} />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            if (value) onChange("");
            else e.currentTarget.blur();
          }
        }}
        placeholder="Search the Vault"
        aria-label="Search the Vault"
        maxLength={100}
        className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="-mr-1 flex size-6 items-center justify-center rounded-sm text-ink-subtle hover:bg-surface-hover hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Kbd data-kbd-hints className="hidden group-focus-within:hidden sm:inline-flex">
          /
        </Kbd>
      )}
    </label>
  );
}
