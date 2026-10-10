"use client";

import {
  ChevronRight,
  Ellipsis,
  FileText,
  Plus,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

import type { PageItem } from "../schema";
import { childrenMap, displayTitle } from "../tree";
import { useNotes } from "./notes-provider";

type Row = { page: PageItem; depth: number; hasChildren: boolean; open: boolean };

const INDENT = 14;

export function PageTree({ className }: { className?: string }) {
  const { pages, currentId, create, remove, isOpen, setOpen } = useNotes();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());

  const children = childrenMap(pages);
  const rows: Row[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const page of children.get(parentId) ?? []) {
      const hasChildren = (children.get(page.id)?.length ?? 0) > 0;
      const open = hasChildren && isOpen(page.id);
      rows.push({ page, depth, hasChildren, open });
      if (open) walk(page.id, depth + 1);
    }
  };
  walk(null, 0);

  const tabStop = rows.some((r) => r.page.id === focusId)
    ? focusId
    : rows.some((r) => r.page.id === currentId)
      ? currentId
      : (rows[0]?.page.id ?? null);

  const focusRow = (id: string | undefined) => id && itemRefs.current.get(id)?.focus();

  function onItemKeyDown(e: KeyboardEvent, row: Row, index: number) {
    const { page } = row;
    if (e.key === "ArrowDown") focusRow(rows[index + 1]?.page.id);
    else if (e.key === "ArrowUp") focusRow(rows[index - 1]?.page.id);
    else if (e.key === "Home") focusRow(rows[0]?.page.id);
    else if (e.key === "End") focusRow(rows.at(-1)?.page.id);
    else if (e.key === "ArrowRight") {
      if (row.hasChildren && !row.open) setOpen(page.id, true);
      else if (row.open) focusRow(rows[index + 1]?.page.id);
      else return;
    } else if (e.key === "ArrowLeft") {
      if (row.open) setOpen(page.id, false);
      else if (page.parentId) focusRow(page.parentId);
      else return;
    } else if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
      focusRow(rows[index + 1]?.page.id ?? rows[index - 1]?.page.id);
      remove(page.id);
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) setMenuFor(page.id);
    else return;
    e.preventDefault();
  }

  function onContextMenu(e: MouseEvent, id: string) {
    e.preventDefault();
    setMenuFor(id);
  }

  return (
    <nav aria-label="Pages" className={className}>
      <div className="mb-1.5 flex items-center justify-between pr-1 pl-2.5">
        <p className="text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">Pages</p>
        <button
          type="button"
          onClick={() => create(null)}
          aria-label="New page"
          title="New page"
          className="flex size-7 items-center justify-center rounded-md text-ink-subtle transition-[background-color,color,transform] hover:bg-surface-hover hover:text-ink active:scale-90"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {rows.length > 0 && (
        <div role="tree" aria-label="Pages" className="flex flex-col gap-px">
          <AnimatePresence initial={false}>
            {rows.map((row, i) => {
              const { page, depth } = row;
              const active = page.id === currentId;
              return (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
                  transition={spring.gentle}
                  onContextMenu={(e) => onContextMenu(e, page.id)}
                  className={cn(
                    "group relative flex h-8 shrink-0 items-center rounded-md pr-1 text-[13.5px] transition-colors",
                    active
                      ? "bg-surface-raised font-medium text-ink"
                      : "text-ink-muted hover:bg-surface-hover/70 hover:text-ink",
                  )}
                  style={{ paddingLeft: 4 + depth * INDENT }}
                >
                  {row.hasChildren ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => setOpen(page.id, !row.open)}
                      className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-muted"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform duration-300 ease-spring",
                          row.open && "rotate-90",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="size-5 shrink-0" />
                  )}
                  <Link
                    ref={(el) => {
                      if (el) itemRefs.current.set(page.id, el);
                      else itemRefs.current.delete(page.id);
                    }}
                    href={`/notes/${page.id}` as Route}
                    role="treeitem"
                    aria-level={depth + 1}
                    aria-expanded={row.hasChildren ? row.open : undefined}
                    aria-selected={active}
                    aria-current={active ? "page" : undefined}
                    tabIndex={page.id === tabStop ? 0 : -1}
                    onFocus={() => setFocusId(page.id)}
                    onKeyDown={(e) => onItemKeyDown(e, row, i)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 pl-0.5 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-accent"
                  >
                    <PageIcon icon={page.icon} />
                    <span className={cn("truncate", !page.title.trim() && "text-ink-subtle")}>
                      {displayTitle(page.title)}
                    </span>
                  </Link>
                  <span
                    className={cn(
                      "relative z-10 ml-1 flex items-center gap-px opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                      menuFor === page.id && "opacity-100",
                    )}
                  >
                    <Popover
                      open={menuFor === page.id}
                      onOpenChange={(o) => setMenuFor(o ? page.id : null)}
                      label={`Actions for ${displayTitle(page.title)}`}
                      trigger={
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={`More actions for ${displayTitle(page.title)}`}
                          onClick={() => setMenuFor(menuFor === page.id ? null : page.id)}
                          className="flex size-6 items-center justify-center rounded-sm text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
                        >
                          <Ellipsis className="size-3.5" />
                        </button>
                      }
                    >
                      <MenuItem
                        icon={<SquareArrowOutUpRight />}
                        onSelect={() => {
                          setMenuFor(null);
                          itemRefs.current.get(page.id)?.click();
                        }}
                      >
                        Open
                      </MenuItem>
                      <MenuItem
                        icon={<Plus />}
                        onSelect={() => {
                          setMenuFor(null);
                          create(page.id);
                        }}
                      >
                        Add a page inside
                      </MenuItem>
                      <MenuGap />
                      <MenuItem
                        icon={<Trash2 />}
                        tone="danger"
                        hint="Del"
                        onSelect={() => {
                          setMenuFor(null);
                          remove(page.id);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </Popover>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={`Add a page inside ${displayTitle(page.title)}`}
                      title="Add a page inside"
                      onClick={() => create(page.id)}
                      className="flex size-6 items-center justify-center rounded-sm text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <button
        type="button"
        onClick={() => create(null)}
        className="mt-1 flex h-8 w-full items-center gap-2 rounded-md pl-[9px] text-[13px] text-ink-subtle transition-colors hover:bg-surface-hover/70 hover:text-ink"
      >
        <Plus className="size-4" />
        New page
      </button>
    </nav>
  );
}

export function PageIcon({ icon, className }: { icon: string | null; className?: string }) {
  return icon ? (
    <span
      aria-hidden
      className={cn("w-4 shrink-0 text-center text-[14px] leading-none", className)}
    >
      {icon}
    </span>
  ) : (
    <FileText
      aria-hidden
      className={cn("size-4 shrink-0 text-ink-subtle", className)}
      strokeWidth={1.75}
    />
  );
}
