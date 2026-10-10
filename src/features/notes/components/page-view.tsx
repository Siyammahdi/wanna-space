"use client";

import { Check, ChevronRight, Ellipsis, Link2, Plus, Smile, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { EmojiPicker } from "@/components/ui/emoji-picker";
import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

import { TITLE_MAX, type PageDoc, type PageWithContent } from "../schema";
import { updatePage } from "../server/actions";
import { ancestorsOf, displayTitle } from "../tree";
import { EditedAt } from "./edited-at";
import { NoteEditor, type NoteEditorApi } from "./editor/note-editor";
import { openPages, useNotes } from "./notes-provider";
import { PageIcon } from "./page-tree";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Debounced, strictly sequential document saves: the newest document always wins, a
 * failed save is retried with the next one, and nothing is lost on navigation.
 */
function useAutosave(pageId: string, skip: () => boolean) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef<PageDoc | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  async function flush() {
    window.clearTimeout(timer.current);
    while (inflight.current) await inflight.current;
    const doc = pending.current;
    if (!doc || skip()) return;
    pending.current = null;
    setStatus("saving");
    // ProseMirror attrs aren't plain objects; server actions only carry plain JSON.
    const content = JSON.parse(JSON.stringify(doc)) as PageDoc;
    const run = updatePage({ id: pageId, content })
      .catch(() => null)
      .then((result) => {
        if (result?.ok) {
          setStatus(pending.current ? "pending" : "saved");
          return;
        }
        pending.current ??= doc;
        setStatus("error");
        toast({
          id: "notes-save",
          message: result?.error ?? "Couldn’t save this page. We’ll keep trying.",
        });
      });
    inflight.current = run;
    await run;
    inflight.current = null;
  }

  function schedule(doc: PageDoc) {
    pending.current = doc;
    setStatus("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 700);
  }

  const flushRef = useRef(flush);
  useLayoutEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || inflight.current) {
        void flushRef.current();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushRef.current();
    };
  }, []);

  return { status, schedule, flush };
}

export function PageView({ page }: { page: PageWithContent }) {
  const notes = useNotes();
  const live = notes.pages.find((p) => p.id === page.id);
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [iconOpen, setIconOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [words, setWords] = useState<number | null>(null);
  const [isNew] = useState(!page.title && !page.content);
  const editorRef = useRef<NoteEditorApi>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleTimer = useRef<number | undefined>(undefined);
  const savedTitle = useRef(page.title);

  // Once the page is deleted (from here or the tree), stop writing to it.
  const gone = useRef(false);
  useLayoutEffect(() => {
    gone.current = !live;
  });
  const save = useAutosave(page.id, () => gone.current);

  const ancestors = ancestorsOf(notes.pages, page.id);
  const ancestorKey = ancestors.map((a) => a.id).join(",");
  useEffect(() => {
    if (ancestorKey) openPages(ancestorKey.split(","));
  }, [ancestorKey]);

  useEffect(() => {
    if (isNew) titleRef.current?.focus();
  }, [isNew]);

  function saveTitle(next = title) {
    window.clearTimeout(titleTimer.current);
    if (next === savedTitle.current || gone.current) return;
    savedTitle.current = next;
    void notes.saveMeta(page.id, { title: next });
  }

  const saveTitleRef = useRef(saveTitle);
  useLayoutEffect(() => {
    saveTitleRef.current = saveTitle;
  });
  useEffect(() => () => saveTitleRef.current(), []);

  function onTitleChange(value: string) {
    const next = value.replace(/\s*\n\s*/g, " ").slice(0, TITLE_MAX);
    setTitle(next);
    window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => saveTitle(next), 500);
  }

  function onTitleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
    if (e.key === "Enter" || (e.key === "ArrowDown" && atEnd)) {
      e.preventDefault();
      saveTitle();
      editorRef.current?.focusStart();
    }
  }

  function pickIcon(next: string | null) {
    setIcon(next);
    setIconOpen(false);
    void notes.saveMeta(page.id, { icon: next });
  }

  async function onDelete() {
    setMenuOpen(false);
    saveTitle();
    await save.flush();
    notes.remove(page.id);
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ id: "notes", message: "Link copied" });
    } catch {
      toast({ id: "notes", message: "Couldn’t copy the link." });
    }
  }

  return (
    <article className="mx-auto w-full max-w-[44rem]">
      <div className="flex h-9 items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-0.5 text-[13px] text-ink-subtle">
            <li className="shrink-0">
              <Link
                href="/notes"
                className="rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover/70 hover:text-ink"
              >
                Notes
              </Link>
            </li>
            {ancestors.map((a) => (
              <li key={a.id} className="flex min-w-0 items-center gap-0.5">
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
                <Link
                  href={`/notes/${a.id}` as Route}
                  className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover/70 hover:text-ink"
                >
                  <PageIcon icon={a.icon} className="size-3.5 text-[12px]" />
                  <span className="truncate">{displayTitle(a.title)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <SaveIndicator status={save.status} onRetry={() => void save.flush()} />
          <Popover
            open={menuOpen}
            onOpenChange={setMenuOpen}
            label="Page actions"
            trigger={
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Page actions"
                aria-expanded={menuOpen}
                className="flex size-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <Ellipsis className="size-4" />
              </button>
            }
          >
            <MenuItem
              icon={<Plus />}
              onSelect={() => {
                setMenuOpen(false);
                void notes.create(page.id);
              }}
            >
              Add a page inside
            </MenuItem>
            <MenuItem icon={<Link2 />} onSelect={() => void copyLink()}>
              Copy link
            </MenuItem>
            <MenuGap />
            <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => void onDelete()}>
              Delete page
            </MenuItem>
          </Popover>
        </div>
      </div>

      <header className="group/head pt-10 pb-3 md:pt-14">
        <Popover
          open={iconOpen}
          onOpenChange={setIconOpen}
          label="Page icon"
          align="start"
          className="p-2"
          trigger={
            icon ? (
              <button
                type="button"
                onClick={() => setIconOpen((o) => !o)}
                aria-label="Change icon"
                aria-expanded={iconOpen}
                className="mb-3 -ml-1.5 flex size-[4.5rem] items-center justify-center rounded-lg text-[3.25rem] leading-none transition-[background-color,transform] hover:bg-surface-hover/70 active:scale-95"
              >
                {icon}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIconOpen((o) => !o)}
                aria-expanded={iconOpen}
                className={cn(
                  "mb-1 -ml-2 flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-subtle opacity-0 transition-[opacity,background-color,color] group-focus-within/head:opacity-100 group-hover/head:opacity-100 hover:bg-surface-hover/70 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
                  (iconOpen || isNew) && "opacity-100",
                )}
              >
                <Smile className="size-4" />
                Add icon
              </button>
            )
          }
        >
          <EmojiPicker value={icon} onPick={pickIcon} />
        </Popover>

        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={onTitleKeyDown}
          onBlur={() => saveTitle()}
          rows={1}
          placeholder="Untitled"
          aria-label="Page title"
          spellCheck
          className="block [field-sizing:content] w-full resize-none overflow-hidden bg-transparent font-heading text-[2.5rem] leading-[1.15] font-semibold tracking-[-0.03em] text-ink outline-none placeholder:text-ink-faint md:text-[2.75rem]"
        />

        <p className="mt-3 flex h-5 items-center gap-2 text-[12.5px] text-ink-subtle">
          <EditedAt iso={live?.updatedAt ?? page.updatedAt} />
          {words !== null && (
            <>
              <span aria-hidden className="text-ink-faint">
                ·
              </span>
              <span className="tabular-nums">
                {words} {words === 1 ? "word" : "words"}
              </span>
            </>
          )}
        </p>
      </header>

      <NoteEditor
        ref={editorRef}
        pageId={page.id}
        initialContent={page.content}
        onChange={save.schedule}
        onWords={setWords}
        onCreateSubpage={() => notes.create(page.id, { navigate: false })}
        onExitTop={() => {
          const el = titleRef.current;
          el?.focus();
          el?.setSelectionRange(el.value.length, el.value.length);
        }}
      />
    </article>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="flex h-8 items-center text-[12.5px] text-ink-subtle">
      <AnimatePresence mode="wait" initial={false}>
        {status === "error" ? (
          <motion.button
            key="error"
            type="button"
            onClick={onRetry}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-md px-2 py-1 text-danger transition-colors hover:bg-danger-soft"
          >
            Not saved · Retry
          </motion.button>
        ) : status === "pending" || status === "saving" ? (
          <motion.span
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 px-2"
          >
            <Spinner className="size-3" />
            Saving
          </motion.span>
        ) : status === "saved" ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 px-2"
          >
            <Check className="size-3.5 text-accent-ink" />
            Saved
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
