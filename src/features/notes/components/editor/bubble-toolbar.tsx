"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Check,
  Code,
  Highlighter,
  Italic,
  Link2,
  Strikethrough,
  Underline,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";
import { isMac } from "@/lib/keyboard";

type Mark = {
  name: string;
  label: string;
  icon: LucideIcon;
  keys: string;
  toggle: (editor: Editor) => void;
};

const MARKS: Mark[] = [
  {
    name: "bold",
    label: "Bold",
    icon: Bold,
    keys: "B",
    toggle: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    name: "italic",
    label: "Italic",
    icon: Italic,
    keys: "I",
    toggle: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    name: "underline",
    label: "Underline",
    icon: Underline,
    keys: "U",
    toggle: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    name: "strike",
    label: "Strikethrough",
    icon: Strikethrough,
    keys: "Shift S",
    toggle: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    name: "code",
    label: "Inline code",
    icon: Code,
    keys: "E",
    toggle: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    name: "highlight",
    label: "Highlight",
    icon: Highlighter,
    keys: "Shift H",
    toggle: (e) => e.chain().focus().toggleHighlight().run(),
  },
];

/** Accepts "example.com" as well as full URLs; refuses script and data URLs. */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      marks: Object.fromEntries(MARKS.map((m) => [m.name, e.isActive(m.name)])),
      link: e.getAttributes("link").href as string | undefined,
    }),
  });
  const mod = isMac() ? "⌘" : "Ctrl ";

  function applyLink(e: FormEvent) {
    e.preventDefault();
    const href = normalizeUrl(linkDraft ?? "");
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    setLinkDraft(null);
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8, onHide: () => setLinkDraft(null) }}
      shouldShow={({ editor: e, state, from, to }) => {
        if (!e.isEditable || from === to) return false;
        if (state.selection instanceof NodeSelection) return false;
        if (e.isActive("codeBlock")) return false;
        return state.doc.textBetween(from, to).trim().length > 0;
      }}
      className="z-40 flex items-center gap-0.5 rounded-lg bg-surface-raised p-1 shadow-lg"
    >
      {linkDraft !== null ? (
        <form onSubmit={applyLink} className="flex items-center gap-1">
          <input
            autoFocus
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setLinkDraft(null);
                editor.commands.focus();
              }
            }}
            placeholder="Paste or type a link"
            aria-label="Link address"
            className="h-8 w-60 rounded-md bg-surface-sunken px-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-accent/45"
          />
          <ToolbarButton label="Apply link" type="submit">
            <Check />
          </ToolbarButton>
          {active.link && (
            <ToolbarButton
              label="Remove link"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkDraft(null);
              }}
            >
              <Unlink />
            </ToolbarButton>
          )}
        </form>
      ) : (
        <>
          {MARKS.map((m) => {
            const Icon = m.icon;
            return (
              <ToolbarButton
                key={m.name}
                label={`${m.label} (${mod}${m.keys})`}
                active={active.marks[m.name]}
                onClick={() => m.toggle(editor)}
              >
                <Icon />
              </ToolbarButton>
            );
          })}
          <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />
          <ToolbarButton
            label={active.link ? "Edit link" : "Add link"}
            active={Boolean(active.link)}
            onClick={() => setLinkDraft(active.link ?? "")}
          >
            <Link2 />
          </ToolbarButton>
        </>
      )}
    </BubbleMenu>
  );
}

function ToolbarButton({
  label,
  active = false,
  type = "button",
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseDown={(e) => type === "button" && e.preventDefault()}
      aria-label={label}
      aria-pressed={type === "button" ? active : undefined}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-[background-color,color,transform] active:scale-90 [&_svg]:size-[15px]",
        active
          ? "bg-accent-soft text-accent-ink"
          : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
