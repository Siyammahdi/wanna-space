"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";

import { formatBytes, tagCounts } from "../filters";
import { guessLanguage, languageName, LANGUAGES, type LanguageId } from "../language";
import { MAX_TAGS, tagName, type VaultItem } from "../schema";
import { copyText, downloadHref } from "./item-menu";
import { Favicon, VaultImage } from "./vault-image";
import { KIND_META } from "./vault-toolbar";
import { useVault } from "./vault-provider";

const FOCUSABLE = "button, [href], input, textarea, select, video, [tabindex]";

const savedOn = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** One item, large: preview or editor on the left, its properties on the right. */
export function ItemDetail() {
  const { shown, items, openId, setOpenId } = useVault();
  const item = items.find((i) => i.id === openId) ?? null;
  const index = shown.findIndex((i) => i.id === openId);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFrame = useRef(0);
  const currentId = useRef(openId);
  const titleId = useId();

  useEffect(() => {
    currentId.current = openId;
  }, [openId]);

  useEffect(() => {
    cancelAnimationFrame(restoreFrame.current);
    returnFocus.current ??=
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      const id = currentId.current;
      const fallback = returnFocus.current;
      restoreFrame.current = requestAnimationFrame(() => {
        const card = id ? document.querySelector<HTMLElement>(`[data-card="${id}"]`) : null;
        (card ?? (fallback?.isConnected ? fallback : null))?.focus({ preventScroll: false });
      });
    };
  }, []);

  const closeIfGone = useEffectEvent(() => setOpenId(null));
  useEffect(() => {
    if (!item) closeIfGone();
  }, [item]);

  if (!item) return null;

  const go = (step: number) => {
    const next = shown[index + step];
    if (next) setOpenId(next.id);
  };

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      setOpenId(null);
    } else if (e.key === "Tab") {
      keepFocusInside(e, e.currentTarget);
    } else if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      !isTypingTarget(e.target) &&
      !(e.target instanceof HTMLVideoElement) &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      go(e.key === "ArrowLeft" ? -1 : 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-6">
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => setOpenId(null)}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } }}
        transition={spring.gentle}
        className="relative flex h-dvh w-full flex-col overflow-y-auto bg-canvas outline-none md:h-[min(46rem,calc(100dvh-3rem))] md:max-w-[70rem] md:flex-row md:overflow-hidden md:rounded-2xl md:shadow-xl"
      >
        <DetailBody
          key={item.id}
          item={item}
          titleId={titleId}
          position={index >= 0 ? { index, total: shown.length } : null}
          onStep={go}
          onClose={() => setOpenId(null)}
        />
      </motion.div>
    </div>
  );
}

function DetailBody({
  item,
  titleId,
  position,
  onStep,
  onClose,
}: {
  item: VaultItem;
  titleId: string;
  position: { index: number; total: number } | null;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  const { update, remove } = useVault();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const latest = useRef({ item, title, body });
  const deleted = useRef(false);
  const textual = item.kind === "note" || item.kind === "snippet";
  const kind = KIND_META[item.kind];

  useEffect(() => {
    latest.current = { item, title, body };
  });

  function commit() {
    if (deleted.current) return;
    const { item: current, title: t, body: b } = latest.current;
    const patch: { title?: string; body?: string } = {};
    if (t.trim() !== current.title) patch.title = t.trim();
    if (b !== current.body) patch.body = b;
    if (Object.keys(patch).length) void update(current.id, patch);
  }

  // Unsaved edits go in when the item changes or the dialog closes.
  const commitOnLeave = useEffectEvent(commit);
  useEffect(() => () => commitOnLeave(), []);

  const titleField = (
    <input
      id={titleId}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder={textual ? "Untitled" : (item.domain ?? "Untitled")}
      aria-label="Title"
      maxLength={200}
      className="w-full rounded-md bg-transparent px-2 py-1 font-heading text-[21px] leading-tight font-semibold tracking-[-0.025em] text-ink transition-colors outline-none placeholder:text-ink-faint hover:bg-surface-hover/60 focus:bg-surface-sunken"
    />
  );

  return (
    <>
      <section
        className={cn(
          "relative flex min-h-0 flex-col md:flex-1",
          textual
            ? "max-md:min-h-[55dvh] max-md:shrink-0"
            : "bg-surface-sunken/60 max-md:h-[44dvh] max-md:shrink-0",
        )}
      >
        {textual ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-14 pb-4 md:px-8 md:pt-8">
            {titleField}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (item.kind === "snippet" && e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const { selectionStart: start, selectionEnd: end } = el;
                  setBody(`${body.slice(0, start)}  ${body.slice(end)}`);
                  requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
                }
              }}
              aria-label={item.kind === "snippet" ? "Code" : "Note"}
              placeholder={item.kind === "snippet" ? "Code…" : "Write…"}
              spellCheck={item.kind === "note"}
              maxLength={50_000}
              className={cn(
                "min-h-0 flex-1 resize-none rounded-lg outline-none placeholder:text-ink-faint",
                item.kind === "snippet"
                  ? "bg-surface-sunken p-4 font-mono text-[13px] leading-[1.65] [tab-size:2] text-ink"
                  : "bg-transparent px-2 py-1 text-[16px] leading-[1.7] text-ink",
              )}
            />
          </div>
        ) : (
          <Preview item={item} />
        )}
      </section>

      <aside className="flex shrink-0 flex-col md:w-[22rem] md:overflow-y-auto md:bg-surface/60">
        <header className="flex h-14 shrink-0 items-center gap-1 pr-3 pl-5 max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:z-10 max-md:bg-canvas/85 max-md:backdrop-blur-sm">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-subtle">
            <kind.icon className="size-3.5 text-room-vault" strokeWidth={2} />
            {kind.label}
          </span>
          {position && (
            <span className="ml-1 text-[12px] text-ink-faint tabular-nums">
              {position.index + 1} / {position.total}
            </span>
          )}
          <span className="flex-1" />
          <IconButton
            label="Previous (←)"
            disabled={!position || position.index === 0}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            label="Next (→)"
            disabled={!position || position.index >= position.total - 1}
            onClick={() => onStep(1)}
          >
            <ChevronRight />
          </IconButton>
          <IconButton label="Close (Esc)" onClick={onClose}>
            <X />
          </IconButton>
        </header>

        <div className="flex flex-col gap-5 px-4 pt-1 pb-6">
          {!textual && <div className="-mx-1">{titleField}</div>}

          {item.url && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-sunken/70 py-1 pr-1 pl-3">
              <Favicon src={item.iconUrl} />
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-[13px] text-accent-ink hover:underline"
                title={item.url}
              >
                {item.url.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
              <IconButton label="Copy link" onClick={() => void copyText(item.url!, "Link")}>
                <Copy />
              </IconButton>
            </div>
          )}

          {!textual && (
            <Field label={item.kind === "link" ? "Description" : "Notes"}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onBlur={commit}
                placeholder={item.kind === "link" ? "What’s this about?" : "Why you kept it…"}
                aria-label={item.kind === "link" ? "Description" : "Notes"}
                maxLength={20_000}
                rows={3}
                className="[field-sizing:content] max-h-64 min-h-20 w-full resize-none rounded-md bg-transparent px-2 py-1.5 text-[13.5px] leading-relaxed text-ink transition-colors outline-none placeholder:text-ink-faint hover:bg-surface-hover/60 focus:bg-surface-sunken"
              />
            </Field>
          )}

          {item.kind === "snippet" && <LanguageField item={item} body={body} />}
          <CollectionField item={item} />
          <TagField item={item} />
          {item.colors.length > 0 && <Colors colors={item.colors} />}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-1 text-[12.5px]">
            <dt className="text-ink-subtle">Saved</dt>
            <dd className="text-ink-muted">{savedOn.format(new Date(item.createdAt))}</dd>
            {item.file && (
              <>
                <dt className="text-ink-subtle">File</dt>
                <dd className="min-w-0 truncate text-ink-muted" title={item.file.name}>
                  {item.file.name}
                </dd>
                <dt className="text-ink-subtle">Size</dt>
                <dd className="text-ink-muted tabular-nums">
                  {[
                    formatBytes(item.file.bytes),
                    item.preview?.width && item.preview.height && !item.preview.remote
                      ? `${item.preview.width} × ${item.preview.height}`
                      : null,
                    item.file.pages && item.file.pages > 1 ? `${item.file.pages} pages` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </>
            )}
          </dl>

          <div className="flex flex-wrap gap-2 px-1">
            {item.file && (
              <a
                href={downloadHref(item)}
                className="inline-flex h-8 items-center gap-2 rounded-sm bg-surface-sunken px-3 text-[13px] font-medium text-ink transition-[transform,background-color] hover:bg-surface-hover active:scale-[0.97] [&_svg]:size-3.5"
              >
                <Download /> Download
              </a>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-sm bg-surface-sunken px-3 text-[13px] font-medium text-ink transition-[transform,background-color] hover:bg-surface-hover active:scale-[0.97] [&_svg]:size-3.5"
              >
                <ExternalLink /> Open {item.kind === "image" ? "original" : "site"}
              </a>
            )}
            {textual && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyText(body, item.kind === "snippet" ? "Code" : "Note")}
              >
                <Copy /> Copy {item.kind === "snippet" ? "code" : "text"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              onClick={() => {
                deleted.current = true;
                remove(item);
              }}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Preview({ item }: { item: VaultItem }) {
  const media = item.file?.media;
  const fileBlock = (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-20 items-center justify-center rounded-2xl bg-surface-raised">
        <FileText className="size-9 text-room-vault" strokeWidth={1.4} />
      </span>
      {item.file && (
        <span className="font-mono text-[12px] tracking-wide text-ink-subtle uppercase">
          .{item.file.ext} · {formatBytes(item.file.bytes)}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4 max-md:pt-16 md:p-8">
      {media ? (
        <video
          src={media}
          poster={item.preview?.thumb}
          controls
          playsInline
          preload="metadata"
          className="max-h-full max-w-full rounded-lg bg-ink"
        />
      ) : item.preview ? (
        <VaultImage
          src={item.preview.full}
          alt={item.title}
          eager
          fallback={fileBlock}
          className="h-auto max-h-full w-auto max-w-full rounded-lg bg-transparent object-contain shadow-lg"
        />
      ) : item.kind === "link" ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-raised">
            <Favicon src={item.iconUrl} className="size-8" />
          </span>
          <p className="text-[14px] text-ink-muted">{item.siteName ?? item.domain}</p>
        </div>
      ) : (
        fileBlock
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

const pickerClass =
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13.5px] text-ink transition-colors hover:bg-surface-hover/60 aria-expanded:bg-surface-sunken [&_svg]:size-4 [&_svg]:shrink-0";

function CollectionField({ item }: { item: VaultItem }) {
  const { collections, update } = useVault();
  const [open, setOpen] = useState(false);
  const current = collections.find((c) => c.id === item.collectionId);
  const pick = (collectionId: string | null) => {
    setOpen(false);
    if (collectionId !== item.collectionId) void update(item.id, { collectionId });
  };
  return (
    <Field label="Collection">
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="Move to collection"
        align="start"
        className="max-h-72 w-60 overflow-y-auto"
        trigger={
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={pickerClass}
          >
            {current ? (
              <span className="size-2 rounded-full bg-room-vault" />
            ) : (
              <Inbox className="text-ink-subtle" />
            )}
            <span className={cn("flex-1 truncate", !current && "text-ink-muted")}>
              {current?.name ?? "Unsorted"}
            </span>
            <ChevronDown className="text-ink-faint" />
          </button>
        }
      >
        <MenuItem
          icon={item.collectionId === null ? <Check /> : <Inbox />}
          active={item.collectionId === null}
          onSelect={() => pick(null)}
        >
          Unsorted
        </MenuItem>
        {collections.map((c) => (
          <MenuItem
            key={c.id}
            icon={item.collectionId === c.id ? <Check /> : <span className="size-[15px]" />}
            active={item.collectionId === c.id}
            onSelect={() => pick(c.id)}
          >
            {c.name}
          </MenuItem>
        ))}
      </Popover>
    </Field>
  );
}

function LanguageField({ item, body }: { item: VaultItem; body: string }) {
  const { update } = useVault();
  const [open, setOpen] = useState(false);
  const pick = (language: LanguageId | null) => {
    setOpen(false);
    const value = language ?? guessLanguage(body);
    if (value !== item.language) void update(item.id, { language: value });
  };
  return (
    <Field label="Language">
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="Language"
        align="start"
        className="max-h-72 w-56 overflow-y-auto"
        trigger={
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={pickerClass}
          >
            <span className={cn("flex-1 truncate", !item.language && "text-ink-muted")}>
              {languageName(item.language) ?? "Not set"}
            </span>
            <ChevronDown className="text-ink-faint" />
          </button>
        }
      >
        <MenuItem icon={<span className="size-[15px]" />} onSelect={() => pick(null)}>
          Detect from the code
        </MenuItem>
        {(Object.keys(LANGUAGES) as LanguageId[]).map((id) => (
          <MenuItem
            key={id}
            icon={item.language === id ? <Check /> : <span className="size-[15px]" />}
            active={item.language === id}
            onSelect={() => pick(id)}
          >
            {LANGUAGES[id]}
          </MenuItem>
        ))}
      </Popover>
    </Field>
  );
}

function TagField({ item }: { item: VaultItem }) {
  const { items, update } = useVault();
  const [value, setValue] = useState("");
  const listId = useId();
  const parsed = tagName.safeParse(value);
  const draft = parsed.success ? parsed.data : "";
  const suggestions = draft
    ? tagCounts(items)
        .map((t) => t.name)
        .filter((t) => t.startsWith(draft) && t !== draft && !item.tags.includes(t))
        .slice(0, 5)
    : [];

  const setTags = (tags: string[]) => void update(item.id, { tags });
  const add = (raw: string) => {
    const result = tagName.safeParse(raw);
    setValue("");
    if (!result.success || item.tags.includes(result.data) || item.tags.length >= MAX_TAGS) return;
    setTags([...item.tags, result.data]);
  };

  return (
    <Field label="Tags">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md px-1 py-1 transition-colors focus-within:bg-surface-sunken hover:bg-surface-hover/60">
        {item.tags.map((t) => (
          <span
            key={t}
            className="flex h-7 items-center gap-0.5 rounded-sm bg-room-vault-soft pr-0.5 pl-2 text-[12.5px] font-medium text-room-vault"
          >
            #{t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => setTags(item.tags.filter((x) => x !== t))}
              className="flex size-5 items-center justify-center rounded-xs transition-colors hover:bg-room-vault/15"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {item.tags.length < MAX_TAGS && (
          <input
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (/[,\s]$/.test(next) && next.trim()) add(next);
              else setValue(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                e.preventDefault();
                add(value);
              } else if (e.key === "Backspace" && !value && item.tags.length) {
                setTags(item.tags.slice(0, -1));
              }
            }}
            onBlur={() => value.trim() && add(value)}
            placeholder={item.tags.length ? "Add tag" : "Add tags…"}
            aria-label="Add a tag"
            aria-describedby={suggestions.length ? listId : undefined}
            maxLength={40}
            className="h-7 min-w-24 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        )}
      </div>
      {suggestions.length > 0 && (
        <div id={listId} className="flex flex-wrap gap-1 px-1 pt-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="h-6 rounded-xs bg-surface-sunken px-2 text-[12px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

function Colors({ colors }: { colors: string[] }) {
  return (
    <Field label="Colors">
      <div className="flex gap-1.5 px-1">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => void copyText(c, c)}
            title={`Copy ${c}`}
            aria-label={`Copy color ${c}`}
            className="group flex flex-1 flex-col items-center gap-1"
          >
            <span
              className="h-9 w-full rounded-md transition-transform duration-200 ease-spring group-hover:-translate-y-0.5 group-active:scale-95"
              style={{ backgroundColor: c }}
            />
            <span className="font-mono text-[10.5px] text-ink-subtle group-hover:text-ink">
              {c}
            </span>
          </button>
        ))}
      </div>
    </Field>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

/** Tab and Shift+Tab wrap around inside the dialog instead of escaping to the page. */
function keepFocusInside(e: ReactKeyboardEvent, root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && el.getClientRects().length > 0,
  );
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
