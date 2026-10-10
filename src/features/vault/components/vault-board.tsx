"use client";

import { Archive, SearchX, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { isTypingTarget, modKey } from "@/lib/keyboard";
import { spring } from "@/lib/motion";

import { estimateHeight, masonry } from "../filters";
import type { VaultItem } from "../schema";
import { ItemDetail } from "./item-detail";
import { filesOf, looksLikeUrl, usePasteRouter } from "./save-bar";
import { PendingCard, VaultCard } from "./vault-card";
import { useVault, type PendingItem } from "./vault-provider";

const PAGE = 90;
const GAP = 16;

type Entry =
  | { key: string; pending: PendingItem; item?: never }
  | { key: string; item: VaultItem; pending?: never };

function columnsFor(width: number) {
  if (width < 520) return width >= 330 ? 2 : 1;
  return Math.max(2, Math.min(6, Math.floor((width + GAP) / (248 + GAP))));
}

const isModalOpen = () => Boolean(document.querySelector("[aria-modal='true']"));

export function VaultBoard({ limited }: { limited: boolean }) {
  const { items, shown, pending, filters, setFilters, setOpenId, remove } = useVault();
  const boardRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasMore = shown.length > limit;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && setLimit((l) => l + PAGE),
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const entries: Entry[] = [
    ...pending.map((p) => ({ key: p.id, pending: p })),
    ...shown.slice(0, limit).map((item) => ({ key: item.id, item })),
  ];
  const count = width === null ? null : columnsFor(width);
  const colWidth = count && width ? (width - GAP * (count - 1)) / count : 280;
  const columns = count
    ? masonry(entries, count, (e) =>
        e.item
          ? estimateHeight(e.item, colWidth)
          : e.pending.kind === "link"
            ? colWidth / 1.91 + 90
            : 170,
      )
    : null;

  function focusCard(id: string | undefined) {
    if (!id) return;
    requestAnimationFrame(() =>
      boardRef.current?.querySelector<HTMLElement>(`[data-card="${id}"]`)?.focus(),
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const el = e.target as HTMLElement;
    const id = el.dataset.card;
    if (!id || e.metaKey || e.ctrlKey || e.altKey) return;
    const ids = (list: Entry[]) => list.flatMap((x) => (x.item ? [x.item.id] : []));
    const grid = columns ? columns.map(ids) : [ids(entries)];
    const col = grid.findIndex((c) => c.includes(id));
    const row = grid[col]?.indexOf(id) ?? -1;
    if (col < 0) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const item = shown.find((i) => i.id === id);
      if (!item) return;
      const next = grid[col]![row + 1] ?? grid[col]![row - 1] ?? grid.flat().find((x) => x !== id);
      remove(item);
      focusCard(next);
      return;
    }

    let target: string | undefined;
    if (e.key === "ArrowDown" || e.key === "j") target = grid[col]![row + 1];
    else if (e.key === "ArrowUp" || e.key === "k") target = grid[col]![row - 1];
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const step = e.key === "ArrowLeft" ? -1 : 1;
      if (!columns) {
        target = grid[0]![row + step];
      } else {
        const y = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
        let best = Infinity;
        for (const other of grid[col + step] ?? []) {
          const rect = boardRef.current
            ?.querySelector(`[data-card="${other}"]`)
            ?.getBoundingClientRect();
          if (!rect) continue;
          const distance = Math.abs(rect.top + rect.height / 2 - y);
          if (distance < best) {
            best = distance;
            target = other;
          }
        }
      }
    } else if (e.key === "Home") target = ids(entries)[0];
    else if (e.key === "End") target = ids(entries).at(-1);
    else return;

    e.preventDefault();
    focusCard(target);
  }

  const filtered = filters.collection !== "all" || filters.kind || filters.tag || filters.q.trim();
  const empty = entries.length === 0;

  return (
    <>
      {empty &&
        (items.length === 0 && !filtered ? (
          <EmptyVault />
        ) : (
          <div className="flex flex-col items-center rounded-xl bg-surface/60 px-6 py-14 text-center">
            <SearchX className="size-6 text-ink-faint" strokeWidth={1.75} />
            <p className="mt-3 text-[14px] font-medium text-ink">
              {filters.q.trim() ? `Nothing matches “${filters.q.trim()}”` : "Nothing here yet"}
            </p>
            <p className="mt-1 text-[13px] text-ink-subtle">
              {filters.collection !== "all" && !filters.q && !filters.kind && !filters.tag
                ? "Save something while this collection is open and it lands here."
                : "Try another word, or clear the filters."}
            </p>
            {(filters.q || filters.kind || filters.tag) && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setFilters({ q: "", kind: null, tag: null })}
              >
                Clear filters
              </Button>
            )}
          </div>
        ))}

      <div
        ref={boardRef}
        onKeyDown={onKeyDown}
        className={cn(
          !empty && "pb-4",
          !columns &&
            "columns-2 gap-4 sm:columns-3 lg:columns-4 2xl:columns-5 [&>*]:mb-4 [&>*]:break-inside-avoid",
          columns && "flex items-start gap-4",
        )}
      >
        {columns
          ? columns.map((column, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
                <AnimatePresence initial={false} mode="popLayout">
                  {column.map((entry) => (
                    <motion.div
                      key={entry.key}
                      layoutId={entry.key}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                      transition={spring.gentle}
                    >
                      {entry.item ? (
                        <VaultCard item={entry.item} onOpen={() => setOpenId(entry.item.id)} />
                      ) : (
                        <PendingCard item={entry.pending} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))
          : entries.map((entry) =>
              entry.item ? (
                <div key={entry.key}>
                  <VaultCard item={entry.item} onOpen={() => setOpenId(entry.item.id)} />
                </div>
              ) : (
                <div key={entry.key}>
                  <PendingCard item={entry.pending} />
                </div>
              ),
            )}
      </div>

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {limited && !hasMore && (
        <p className="py-6 text-center text-[12.5px] text-ink-faint">
          Showing your newest 1,000 items. Search and filters cover these.
        </p>
      )}
    </>
  );
}

/**
 * The detail dialog and the drop overlay. Render outside entrance wrappers: a leftover
 * transform there would pin these fixed layers to the wrapper instead of the viewport.
 */
export function VaultOverlays() {
  const { openId } = useVault();
  return (
    <>
      <PageDrop />
      <AnimatePresence>{openId && <ItemDetail key="detail" />}</AnimatePresence>
    </>
  );
}

function EmptyVault() {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface/60 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-room-vault-soft">
        <Archive className="size-6 text-room-vault" strokeWidth={1.6} />
      </span>
      <h2 className="mt-4 font-heading text-[19px] font-semibold tracking-[-0.02em] text-ink">
        Keep anything worth keeping
      </h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
        Websites, images, design files, code and stray thoughts. Paste a link anywhere on this page,
        drop files in, or jot a note above.
      </p>
      <p
        data-kbd-hints
        className="mt-4 hidden items-center gap-1.5 text-[12px] text-ink-subtle [@media(hover:hover)]:flex"
      >
        <Kbd>{modKey("V")}</Kbd> to paste · <Kbd>/</Kbd> to search
      </p>
    </div>
  );
}

/** Paste and drop anywhere on the page: files upload, links save, text becomes a note. */
function PageDrop() {
  const { upload, saveLink, setComposer, uploadsEnabled } = useVault();
  const routePaste = usePasteRouter();
  const [drag, setDrag] = useState<"files" | "link" | null>(null);
  const depth = useRef(0);

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    if (isTypingTarget(e.target) || isModalOpen()) return;
    const files = filesOf(e.clipboardData);
    if (files.length) {
      e.preventDefault();
      upload(files);
      return;
    }
    const text = e.clipboardData?.getData("text") ?? "";
    if (!text.trim()) return;
    e.preventDefault();
    if (!routePaste(text)) setComposer({ mode: "note", title: "", body: text, language: null });
  });

  const kindOf = (data: DataTransfer | null) =>
    data?.types.includes("Files") ? "files" : data?.types.includes("text/uri-list") ? "link" : null;

  const onDragEnter = useEffectEvent((e: DragEvent) => {
    const kind = kindOf(e.dataTransfer);
    if (!kind || isModalOpen()) return;
    depth.current += 1;
    setDrag(kind);
  });
  const onDragLeave = useEffectEvent(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDrag(null);
  });
  const onDragOver = useEffectEvent((e: DragEvent) => {
    if (kindOf(e.dataTransfer)) e.preventDefault();
  });
  const onDrop = useEffectEvent((e: DragEvent) => {
    const kind = kindOf(e.dataTransfer);
    depth.current = 0;
    setDrag(null);
    if (!kind || isModalOpen()) return;
    e.preventDefault();
    const files = filesOf(e.dataTransfer);
    if (files.length) {
      upload(files);
      return;
    }
    const url = e.dataTransfer
      ?.getData("text/uri-list")
      .split("\n")
      .find((l) => l && !l.startsWith("#"));
    if (url && looksLikeUrl(url)) void saveLink(url.trim());
  });

  useEffect(() => {
    const paste = (e: ClipboardEvent) => onPaste(e);
    const enter = (e: DragEvent) => onDragEnter(e);
    const leave = () => onDragLeave();
    const over = (e: DragEvent) => onDragOver(e);
    const drop = (e: DragEvent) => onDrop(e);
    window.addEventListener("paste", paste);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("paste", paste);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <AnimatePresence>
      {drag && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 p-6 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ scale: 0.92, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={spring.bouncy}
            className="flex h-full max-h-80 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-2xl bg-surface-raised/90 text-center shadow-xl outline-2 -outline-offset-8 outline-room-vault/45 outline-dashed"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-room-vault-soft">
              <Upload className="size-6 text-room-vault" strokeWidth={1.75} />
            </span>
            <p className="font-heading text-[19px] font-semibold tracking-[-0.02em] text-ink">
              {drag === "link" ? "Drop to save this link" : "Drop to save to your Vault"}
            </p>
            <p className="text-[13px] text-ink-subtle">
              {drag === "link"
                ? "We’ll fetch its title, image and icon."
                : uploadsEnabled
                  ? "Images, PDFs, design files, anything up to 10 MB."
                  : "Uploads aren’t switched on yet."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
