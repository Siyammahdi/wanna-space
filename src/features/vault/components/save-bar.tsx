"use client";

import { Check, ChevronDown, Code2, CornerDownLeft, Link2, StickyNote, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { MenuItem, Popover } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { modKey } from "@/lib/keyboard";
import { spring } from "@/lib/motion";

import {
  guessLanguage,
  languageName,
  LANGUAGES,
  looksLikeCode,
  type LanguageId,
} from "../language";
import { useVault, type ComposerState } from "./vault-provider";

/** A single token with a dot and no spaces reads as an address. */
export const looksLikeUrl = (text: string) =>
  /^(https?:\/\/)?([\p{L}\p{N}-]+\.)+[\p{L}]{2,}(:\d+)?([/?#]\S*)?$/iu.test(text.trim()) ||
  /^https?:\/\/\S+$/i.test(text.trim());

/** Files on the clipboard or in a drop, if any. */
export const filesOf = (data: DataTransfer | null) =>
  data ? [...data.files].filter((f) => f.size > 0) : [];

/** Routes pasted text: an address saves, code opens a snippet, anything else a note. */
export function usePasteRouter() {
  const { saveLink, setComposer } = useVault();
  return (text: string) => {
    const value = text.trim();
    if (!value) return false;
    if (looksLikeUrl(value)) {
      void saveLink(value);
      return true;
    }
    if (looksLikeCode(value)) {
      setComposer({ mode: "snippet", title: "", body: text, language: null });
      return true;
    }
    if (value.includes("\n")) {
      setComposer({ mode: "note", title: "", body: text, language: null });
      return true;
    }
    return false;
  };
}

export function SaveBar() {
  const { saveLink, createNote, uploadsEnabled, upload, composer, setComposer } = useVault();
  const routePaste = usePasteRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const text = value.trim();
  const isUrl = looksLikeUrl(text);

  function submit() {
    if (!text) return;
    setValue("");
    if (isUrl) void saveLink(text);
    else void createNote({ title: "", body: text });
  }

  const openComposer = (mode: ComposerState["mode"]) => {
    setComposer({ mode, title: "", body: composer?.body || value, language: null });
    setValue("");
  };

  return (
    <div className="rounded-xl bg-surface-raised transition-shadow focus-within:ring-2 focus-within:ring-accent/40">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="group flex h-14 items-center gap-3 pr-2 pl-4"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-room-vault-soft text-room-vault transition-transform duration-300 ease-spring group-focus-within:-rotate-45">
          <Link2 className="size-3.5" strokeWidth={2.25} />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => {
            const files = filesOf(e.clipboardData);
            if (files.length) {
              e.preventDefault();
              upload(files);
              return;
            }
            const pasted = e.clipboardData.getData("text");
            if (!value && pasted.includes("\n") && routePaste(pasted)) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.stopPropagation();
              setValue("");
            }
          }}
          placeholder="Paste a link, or jot something down…"
          aria-label="Save a link or a quick note"
          maxLength={2048}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        {text ? (
          <button
            type="submit"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-ink px-2.5 text-[12.5px] font-medium text-ink-inverse transition-transform active:scale-95"
          >
            {isUrl ? "Save link" : "Save note"} <CornerDownLeft className="size-3.5" />
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5">
            <ComposerButton icon={StickyNote} label="Note" onClick={() => openComposer("note")} />
            <ComposerButton icon={Code2} label="Snippet" onClick={() => openComposer("snippet")} />
            {uploadsEnabled && (
              <>
                <ComposerButton
                  icon={Upload}
                  label="Upload"
                  onClick={() => fileRef.current?.click()}
                />
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    upload([...(e.target.files ?? [])]);
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </div>
        )}
      </form>

      <AnimatePresence initial={false}>
        {composer && (
          <motion.div
            key="composer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.16 } }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <Composer
              state={composer}
              onChange={setComposer}
              onDone={() => requestAnimationFrame(() => inputRef.current?.focus())}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComposerButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Upload;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-muted transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-95 max-sm:w-9 max-sm:justify-center max-sm:px-0"
    >
      <Icon className="size-4" strokeWidth={1.9} />
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}

function Composer({
  state,
  onChange,
  onDone,
}: {
  state: ComposerState;
  onChange: (next: ComposerState | null) => void;
  onDone: () => void;
}) {
  const { createNote, createSnippet, collections, target } = useVault();
  const [saving, setSaving] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const snippet = state.mode === "snippet";
  const guessed = snippet ? guessLanguage(state.body) : null;
  const where = [
    collections.find((c) => c.id === target.collectionId)?.name,
    ...target.tags.map((t) => `#${t}`),
  ].filter(Boolean);
  const canSave = snippet
    ? state.body.trim().length > 0
    : Boolean(state.title.trim() || state.body.trim());

  const set = (patch: Partial<ComposerState>) => onChange({ ...state, ...patch });

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const ok = snippet
      ? await createSnippet({
          title: state.title,
          body: state.body,
          language: state.language ?? guessed,
        })
      : await createNote({ title: state.title, body: state.body });
    setSaving(false);
    if (ok) {
      onChange(null);
      onDone();
    }
  }

  function cancel() {
    const draft = state;
    onChange(null);
    onDone();
    if (draft.title.trim() || draft.body.trim()) {
      toast({
        message: snippet ? "Snippet discarded" : "Note discarded",
        action: { label: "Undo", onAction: () => onChange(draft) },
      });
    }
  }

  return (
    <div
      className="flex flex-col gap-2 px-3 pt-1 pb-3"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void save();
        } else if (e.key === "Escape" && !langOpen) {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        }
      }}
    >
      <input
        value={state.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder={snippet ? "Snippet name (optional)" : "Title (optional)"}
        aria-label="Title"
        maxLength={200}
        autoFocus={!state.body}
        className="h-9 rounded-md bg-transparent px-2 font-heading text-[16px] font-semibold tracking-[-0.01em] text-ink outline-none placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-faint"
      />
      <textarea
        value={state.body}
        onChange={(e) => set({ body: e.target.value })}
        onKeyDown={(e) => {
          if (snippet && e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: start, selectionEnd: end } = el;
            set({ body: `${state.body.slice(0, start)}  ${state.body.slice(end)}` });
            requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
          }
        }}
        placeholder={snippet ? "Paste or write code…" : "Write a note…"}
        aria-label={snippet ? "Code" : "Note"}
        autoFocus={Boolean(state.body)}
        spellCheck={!snippet}
        maxLength={snippet ? 50_000 : 20_000}
        rows={snippet ? 6 : 3}
        className={cn(
          "[field-sizing:content] max-h-[50vh] min-h-24 resize-none rounded-lg outline-none placeholder:text-ink-faint",
          snippet
            ? "bg-surface-sunken p-3 font-mono text-[12.5px] leading-[1.6] [tab-size:2] text-ink"
            : "bg-transparent px-2 py-1 text-[14.5px] leading-relaxed text-ink",
        )}
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {snippet && (
          <Popover
            open={langOpen}
            onOpenChange={setLangOpen}
            label="Language"
            align="start"
            className="max-h-72 w-52 overflow-y-auto"
            trigger={
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={langOpen}
                onClick={() => setLangOpen(!langOpen)}
                className="flex h-8 items-center gap-1.5 rounded-md bg-surface-sunken px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
              >
                {state.language
                  ? languageName(state.language)
                  : guessed
                    ? `${languageName(guessed)} · auto`
                    : "Language · auto"}
                <ChevronDown className="size-3.5" />
              </button>
            }
          >
            <MenuItem
              active={!state.language}
              icon={!state.language ? <Check /> : <span className="size-[15px]" />}
              onSelect={() => {
                set({ language: null });
                setLangOpen(false);
              }}
            >
              Detect automatically
            </MenuItem>
            {(Object.keys(LANGUAGES) as LanguageId[]).map((id) => (
              <MenuItem
                key={id}
                active={state.language === id}
                icon={state.language === id ? <Check /> : <span className="size-[15px]" />}
                onSelect={() => {
                  set({ language: id });
                  setLangOpen(false);
                }}
              >
                {LANGUAGES[id]}
              </MenuItem>
            ))}
          </Popover>
        )}
        {where.length > 0 && (
          <span className="truncate text-[12.5px] text-ink-subtle">
            Saving to {where.join(" · ")}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!canSave || saving}>
            Save {snippet ? "snippet" : "note"}
            <Kbd
              data-kbd-hints
              className="-mr-1 hidden bg-ink-inverse/15 text-ink-inverse/75 sm:inline-flex"
            >
              {modKey("↵")}
            </Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
