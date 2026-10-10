"use client";

import {
  CheckCircle2,
  Circle,
  Code,
  File,
  FilePlus2,
  FileText,
  ImageIcon,
  Inbox,
  Keyboard,
  Link2,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  StickyNote,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setThemePreference } from "@/components/theme/theme-switcher";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { COMMAND_PALETTE_EVENT } from "@/lib/command-palette";
import { modKey } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { requestQuickCapture } from "@/lib/quick-capture";
import { highlight, SEARCH_MIN, searchWords } from "@/lib/search";
import { requestSettings } from "@/lib/settings";

/** A search hit supplied by a feature, rendered in its room's group. */
export type PaletteResult = {
  id: string;
  group: "Tasks" | "Pages" | "Vault";
  label: string;
  hint?: string;
  /** Where the query matched, when it isn't in the label (a note, a page's text). */
  snippet?: string;
  href: Route;
  glyph: "task" | "task-done" | "page" | "link" | "image" | "file" | "code" | "note";
  /** Pages: their emoji, shown instead of the glyph. */
  emoji?: string | null;
};

/** A navigable place beyond the rooms, e.g. the Inbox or a project. */
export type PalettePlace = {
  id: string;
  label: string;
  hint?: string;
  href: Route;
  /** Color class for a dot icon (projects). */
  dot?: string;
  /** Only listed once the user types (there can be many). */
  searchOnly?: boolean;
  /** Other words that find it (a project's keyword). */
  keywords?: string;
};

type Group = "Jump to" | PaletteResult["group"] | "Actions";

type Item = {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  snippet?: string;
  keywords?: string;
  icon: ReactNode;
  shortcut?: string;
  muted?: boolean;
  run: () => void;
};

const GROUPS: Group[] = ["Jump to", "Tasks", "Pages", "Vault", "Actions"];
const DEBOUNCE_MS = 140;

const GLYPHS: Record<PaletteResult["glyph"], [LucideIcon, string]> = {
  task: [Circle, "text-ink-faint"],
  "task-done": [CheckCircle2, "text-room-tasks"],
  page: [FileText, "text-room-notes"],
  link: [Link2, "text-room-vault"],
  image: [ImageIcon, "text-room-vault"],
  file: [File, "text-room-vault"],
  code: [Code, "text-room-vault"],
  note: [StickyNote, "text-room-vault"],
};

function Highlighted({ text, words }: { text: string; words: string[] }) {
  return highlight(text, words).map((run, i) =>
    run.hit ? (
      <mark key={i} className="rounded-[3px] bg-accent-soft font-medium text-accent-ink">
        {run.text}
      </mark>
    ) : (
      run.text
    ),
  );
}

/** Prefix beats word start beats substring beats loose subsequence; 0 means no match. */
function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 4;
  if (t.includes(` ${q}`)) return 3;
  if (t.includes(q)) return 2;
  let i = 0;
  for (const c of t) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
}

const iconOf = (Icon: LucideIcon, className?: string) => (
  <Icon className={cn("size-4", className)} strokeWidth={1.9} />
);

export function CommandPalette({
  places,
  search,
  newPage,
}: {
  places: PalettePlace[];
  search: (query: string) => Promise<PaletteResult[]>;
  /** Creates a page and navigates to it. */
  newPage: () => Promise<void>;
}) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<{ query: string; items: PaletteResult[] }>({
    query: "",
    items: [],
  });
  const returnFocus = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function show() {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setResults({ query: "", items: [] });
    setActive(0);
    setOpen(true);
  }

  function hide() {
    setOpen(false);
    const el = returnFocus.current;
    requestAnimationFrame(() => el?.isConnected && el.focus());
  }

  const onGlobalKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (open) hide();
      else show();
    }
  });
  const onRequest = useEffectEvent(() => !open && show());

  useEffect(() => {
    const key = (e: KeyboardEvent) => onGlobalKey(e);
    const request = () => onRequest();
    window.addEventListener("keydown", key);
    window.addEventListener(COMMAND_PALETTE_EVENT, request);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener(COMMAND_PALETTE_EVENT, request);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const words = searchWords(q);

  useEffect(() => {
    if (!open || q.length < SEARCH_MIN) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const items = await search(q).catch(() => []);
      if (!cancelled) setResults({ query: q, items });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, q, search]);

  const go = (href: Route) => () => router.push(href);

  const commands: Item[] = [
    ...rooms.map((room) => ({
      id: `room-${room.id}`,
      group: "Jump to" as const,
      label: room.label,
      hint: room.status === "planned" ? "Coming soon" : undefined,
      keywords: room.tagline,
      icon: iconOf(room.icon, room.tone.text),
      run: go(room.href),
    })),
    ...places
      .filter((p) => q || !p.searchOnly)
      .map((p) => ({
        id: `place-${p.id}`,
        group: "Jump to" as const,
        label: p.label,
        hint: p.hint,
        keywords: p.keywords,
        icon: p.dot ? (
          <span className="flex size-4 items-center justify-center">
            <span className={cn("size-2 rounded-full", p.dot)} />
          </span>
        ) : (
          iconOf(Inbox, "text-ink-subtle")
        ),
        run: go(p.href),
      })),
    {
      id: "new-task",
      group: "Actions",
      label: "New task",
      keywords: "add capture create todo",
      icon: iconOf(Plus, "text-room-tasks"),
      shortcut: "C",
      run: () => window.setTimeout(requestQuickCapture, 60),
    },
    {
      id: "new-page",
      group: "Actions",
      label: "New page",
      keywords: "note document write create",
      icon: iconOf(FilePlus2, "text-room-notes"),
      run: () => startTransition(() => newPage()),
    },
    {
      id: "settings",
      group: "Actions",
      label: "Open settings",
      keywords: "preferences account profile week time format export",
      icon: iconOf(Settings, "text-ink-subtle"),
      shortcut: modKey(","),
      run: () => window.setTimeout(() => requestSettings(), 60),
    },
    {
      id: "shortcuts",
      group: "Actions",
      label: "Keyboard shortcuts",
      keywords: "keys hotkeys help",
      icon: iconOf(Keyboard, "text-ink-subtle"),
      run: () => window.setTimeout(() => requestSettings("shortcuts"), 60),
    },
    {
      id: "theme-light",
      group: "Actions",
      label: "Light theme",
      keywords: "appearance mode day",
      icon: iconOf(Sun, "text-ink-subtle"),
      run: () => setThemePreference("light"),
    },
    {
      id: "theme-dark",
      group: "Actions",
      label: "Dark theme",
      keywords: "appearance mode night",
      icon: iconOf(Moon, "text-ink-subtle"),
      run: () => setThemePreference("dark"),
    },
    {
      id: "theme-system",
      group: "Actions",
      label: "Match system theme",
      keywords: "appearance mode auto",
      icon: iconOf(Monitor, "text-ink-subtle"),
      run: () => setThemePreference("system"),
    },
  ];

  // The last answer stays up while the next one loads, so the list doesn't blink per key.
  const resultItems: Item[] =
    q.length >= SEARCH_MIN && results.query
      ? results.items.map((r) => ({
          id: `${r.group}-${r.id}`,
          group: r.group,
          label: r.label,
          hint: r.hint,
          snippet: r.snippet,
          muted: r.glyph === "task-done",
          icon: r.emoji ? (
            <span className="flex size-4 items-center justify-center text-[14px] leading-none">
              {r.emoji}
            </span>
          ) : (
            iconOf(...GLYPHS[r.glyph])
          ),
          run: go(r.href),
        }))
      : [];
  const searching = q.length >= SEARCH_MIN && results.query !== q;

  const matched = q
    ? commands
        .map((c) => {
          // Keywords are a bag of words: a loose subsequence across them is noise.
          const k = c.keywords ? score(c.keywords, q) : 0;
          return { c, s: Math.max(score(c.label, q), k > 1 ? k : 0) };
        })
        .filter((m) => m.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((m) => m.c)
    : commands;
  const items = GROUPS.flatMap((g) => [...matched, ...resultItems].filter((i) => i.group === g));
  const activeIndex = Math.min(active, items.length - 1);

  function run(item: Item | undefined) {
    if (!item) return;
    hide();
    item.run();
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const step =
      e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")
        ? 1
        : e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")
          ? -1
          : 0;
    if (step && items.length) {
      e.preventDefault();
      setActive((activeIndex + step + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hide();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={hide}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={spring.snappy}
            className="relative flex max-h-[min(560px,72vh)] w-full max-w-xl flex-col rounded-2xl bg-canvas p-2 shadow-xl"
          >
            <div className="flex h-12 shrink-0 items-center gap-3 rounded-xl bg-surface-raised px-4">
              <Search className="size-[18px] text-ink-subtle" strokeWidth={2} />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Search tasks, pages and the Vault, or run a command…"
                aria-label="Search your space and commands"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={items.length ? `${listId}-${activeIndex}` : undefined}
                maxLength={100}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              {searching ? <Spinner className="size-4 text-ink-subtle" /> : <Kbd>Esc</Kbd>}
            </div>

            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Results"
              className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-1"
            >
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13.5px] text-ink-subtle">
                  {searching ? "Searching your space…" : `Nothing matches “${query.trim()}”.`}
                </p>
              ) : (
                items.map((item, index) => (
                  <div key={item.id}>
                    {item.group !== items[index - 1]?.group && (
                      <p className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
                        {item.group}
                      </p>
                    )}
                    <div
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseMove={() => index !== activeIndex && setActive(index)}
                      onClick={() => run(item)}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px]",
                        item.snippet ? "min-h-14 py-2" : "h-10",
                      )}
                    >
                      {index === activeIndex && (
                        <motion.span
                          layoutId="palette-active"
                          transition={spring.snappy}
                          className="absolute inset-0 rounded-lg bg-surface-hover"
                        />
                      )}
                      <span
                        className={cn(
                          "relative flex shrink-0 items-center",
                          item.snippet && "self-start pt-0.5",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="relative flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn("truncate", item.muted ? "text-ink-subtle" : "text-ink")}
                        >
                          {item.group === "Jump to" || item.group === "Actions" ? (
                            item.label
                          ) : (
                            <Highlighted text={item.label} words={words} />
                          )}
                        </span>
                        {item.snippet && (
                          <span className="mt-0.5 truncate text-[12.5px] text-ink-subtle">
                            <Highlighted text={item.snippet} words={words} />
                          </span>
                        )}
                      </span>
                      {item.hint && (
                        <span className="relative max-w-[45%] shrink-0 truncate text-[12px] text-ink-subtle">
                          {item.hint}
                        </span>
                      )}
                      {item.shortcut && <Kbd className="relative">{item.shortcut}</Kbd>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden shrink-0 items-center gap-4 px-3 pt-2 pb-1 text-[11.5px] text-ink-faint sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↵</Kbd> open
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>Esc</Kbd> close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
