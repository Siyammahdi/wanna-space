"use client";

import type { Range } from "@tiptap/core";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import type { Route } from "next";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";

import type { PageDoc } from "../../schema";
import { childrenMap, displayTitle } from "../../tree";
import { useNotes } from "../notes-provider";
import { PageIcon } from "../page-tree";
import { BlockHandle, type BlockHandleApi } from "./block-handle";
import { BLOCKS, matchBlocks, PAGE_BLOCK, type SlashItem } from "./blocks";
import { BubbleToolbar } from "./bubble-toolbar";
import { DocPreview } from "./doc-preview";
import { BlockKeys, Callout, PageLink } from "./nodes";
import { createSlashStore, SlashCommand, type SlashStore } from "./slash";
import { SlashMenu } from "./slash-menu";

export type NoteEditorApi = { focusStart: () => void };

type NoteEditorProps = {
  pageId: string;
  initialContent: PageDoc | null;
  onChange: (doc: PageDoc) => void;
  /** Creates a subpage and returns its id (the editor links to it). */
  onCreateSubpage: () => Promise<string | null>;
  /** ↑ / Backspace at the very start of the document hands focus back to the title. */
  onExitTop: () => void;
  onWords?: (words: number) => void;
  ref?: Ref<NoteEditorApi>;
};

const countWords = (editor: Editor) =>
  (editor.storage.characterCount as { words: () => number }).words();

/** Fired on the editor DOM by the slash menu's "Page" item; the component creates the page. */
const SUBPAGE_EVENT = "ws:notes-subpage";

function createExtensions(store: SlashStore) {
  const slashItems: (SlashItem & { keywords: string })[] = [
    ...BLOCKS.map((b) => ({
      ...b,
      run: (editor: Editor, range: Range) =>
        b.apply(editor.chain().focus().deleteRange(range)).run(),
    })),
    {
      ...PAGE_BLOCK,
      run: (editor: Editor, range: Range) => {
        editor.chain().focus().deleteRange(range).run();
        editor.view.dom.dispatchEvent(new Event(SUBPAGE_EVENT, { bubbles: true }));
      },
    },
  ];
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
      dropcursor: { color: "var(--accent)", width: 3, class: "ws-dropcursor" },
      codeBlock: { HTMLAttributes: { spellcheck: "false" } },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight,
    CharacterCount,
    Placeholder.configure({
      showOnlyCurrent: true,
      placeholder: ({ editor, node, pos }) => {
        if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
        if (node.type.name === "callout") return "Type a note…";
        const parent = editor.state.doc.resolve(pos).parent.type.name;
        if (parent === "taskItem") return "To-do";
        if (parent === "listItem") return "List";
        if (parent === "blockquote") return "Quote";
        return "Write something, or press / for blocks";
      },
    }),
    Callout,
    PageLink,
    BlockKeys,
    SlashCommand.configure({ store, items: (query) => matchBlocks(slashItems, query) }),
  ];
}

export function NoteEditor({
  pageId,
  initialContent,
  onChange,
  onCreateSubpage,
  onExitTop,
  onWords,
  ref,
}: NoteEditorProps) {
  const { pages } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BlockHandleApi>(null);
  const [store] = useState(createSlashStore);
  const callbacks = useRef({ onChange, onExitTop, onWords });
  useLayoutEffect(() => {
    callbacks.current = { onChange, onExitTop, onWords };
  });

  const [extensions] = useState(() => createExtensions(store));

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: (initialContent as JSONContent | null) ?? undefined,
    editorProps: {
      attributes: {
        class: "ws-prose",
        "aria-label": "Page content",
        role: "textbox",
        "aria-multiline": "true",
      },
      handleClick: (_view, _pos, event) => {
        const link = (event.target as HTMLElement).closest("a[href]");
        if (link instanceof HTMLAnchorElement && (event.metaKey || event.ctrlKey)) {
          window.open(link.href, "_blank", "noopener,noreferrer");
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const { selection } = view.state;
        const atStart = selection.empty && selection.from <= 1;
        if (
          atStart &&
          (event.key === "ArrowUp" ||
            (event.key === "Backspace" && view.state.doc.textContent === ""))
        ) {
          event.preventDefault();
          callbacks.current.onExitTop();
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: e }) => callbacks.current.onWords?.(countWords(e)),
    onUpdate: ({ editor: e }) => {
      callbacks.current.onChange(e.getJSON() as PageDoc);
      callbacks.current.onWords?.(countWords(e));
    },
  });

  const onSubpageRequest = useEffectEvent(() => {
    void onCreateSubpage().then((id) => {
      if (id) editor?.chain().focus().insertPageLink(id).run();
    });
  });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => onSubpageRequest();
    el.addEventListener(SUBPAGE_EVENT, handler);
    return () => el.removeEventListener(SUBPAGE_EVENT, handler);
  }, []);

  useImperativeHandle(ref, () => ({
    focusStart: () => editor?.chain().focus("start").run(),
  }));

  function onKeyDownCapture(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      handleRef.current?.openMenuAtSelection();
    }
  }

  const pageTitle = (id: string) => {
    const p = pages.find((x) => x.id === id);
    return p ? displayTitle(p.title) : null;
  };

  return (
    <div
      ref={containerRef}
      onKeyDownCapture={onKeyDownCapture}
      className="relative lg:-ml-14 lg:pl-14"
    >
      {editor ? (
        <>
          <BlockHandle editor={editor} containerRef={containerRef} ref={handleRef} />
          <EditorContent editor={editor} />
          <BubbleToolbar editor={editor} />
          <SlashMenu store={store} />
          <PagesInside editor={editor} pageId={pageId} />
        </>
      ) : (
        <DocPreview doc={initialContent} pageTitle={pageTitle} />
      )}
    </div>
  );
}

/** Subpages that aren't already linked in the text, so nothing nested is ever hidden. */
function PagesInside({ editor, pageId }: { editor: Editor; pageId: string }) {
  const { pages, create } = useNotes();
  const linked = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ids: string[] = [];
      e.state.doc.descendants((node) => {
        if (node.type.name === "pageLink" && typeof node.attrs.id === "string")
          ids.push(node.attrs.id);
        return node.isBlock && node.type.name !== "pageLink";
      });
      return ids.join(",");
    },
  });
  const linkedSet = new Set(linked.split(","));
  const unlinked = (childrenMap(pages).get(pageId) ?? []).filter((p) => !linkedSet.has(p.id));
  if (unlinked.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby={`inside-${pageId}`}>
      <h2
        id={`inside-${pageId}`}
        className="mb-2 px-2 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase"
      >
        Inside this page
      </h2>
      <div className="flex flex-col gap-px">
        {unlinked.map((p) => (
          <Link
            key={p.id}
            href={`/notes/${p.id}` as Route}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[15px] text-ink transition-colors hover:bg-surface-hover/70"
          >
            <PageIcon icon={p.icon} />
            <span className="truncate underline decoration-ink-faint/60 underline-offset-[5px]">
              {displayTitle(p.title)}
            </span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => void create(pageId)}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[14px] text-ink-subtle transition-colors hover:bg-surface-hover/70 hover:text-ink"
        >
          <span className="w-4 text-center">+</span> Add a page inside
        </button>
      </div>
    </section>
  );
}
