"use client";

import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { NodeSelection, Selection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { ArrowDown, ArrowUp, Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useState,
  type DragEvent,
  type Ref,
  type RefObject,
} from "react";

import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { isMac } from "@/lib/keyboard";

import { BLOCKS, blockAt, moveBlock } from "./blocks";

type Hovered = { pos: number; node: PmNode; top: number };

export type BlockHandleApi = { openMenuAtSelection: () => void };

/** Notion-style handle in the left gutter: + adds a block below, ⋮⋮ drags or opens actions. */
export function BlockHandle({
  editor,
  containerRef,
  ref,
}: {
  editor: Editor;
  containerRef: RefObject<HTMLDivElement | null>;
  ref?: Ref<BlockHandleApi>;
}) {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function measure(pos: number, node: PmNode): Hovered | null {
    const dom = editor.view.nodeDOM(pos);
    const container = containerRef.current;
    if (!(dom instanceof HTMLElement) || !container) return null;
    const rect = dom.getBoundingClientRect();
    const style = getComputedStyle(dom);
    const line = parseFloat(style.lineHeight) || 26;
    const padTop = parseFloat(style.paddingTop) || 0;
    const top =
      rect.top -
      container.getBoundingClientRect().top +
      padTop +
      Math.min(line, rect.height) / 2 -
      14;
    return { pos, node, top };
  }

  const onMove = useEffectEvent((e: MouseEvent) => {
    if (menuOpen || editor.view.dragging) return;
    const content = editor.view.dom.getBoundingClientRect();
    if (e.clientY < content.top || e.clientY > content.bottom) return setHovered(null);
    const hit = editor.view.posAtCoords({ left: content.left + 32, top: e.clientY });
    if (!hit) return;
    const block = blockAt(editor.state.doc, hit.inside >= 0 ? hit.inside : hit.pos);
    if (!block) return setHovered(null);
    if (hovered?.pos === block.pos && hovered.node === block.node) return;
    setHovered(measure(block.pos, block.node));
  });

  const onLeave = useEffectEvent(() => {
    if (!menuOpen) setHovered(null);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const move = (e: MouseEvent) => onMove(e);
    const leave = () => onLeave();
    const typing = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) setHovered(null);
    };
    container.addEventListener("mousemove", move);
    container.addEventListener("mouseleave", leave);
    container.addEventListener("keydown", typing);
    return () => {
      container.removeEventListener("mousemove", move);
      container.removeEventListener("mouseleave", leave);
      container.removeEventListener("keydown", typing);
    };
  }, [containerRef]);

  useImperativeHandle(ref, () => ({
    openMenuAtSelection() {
      const { selection, doc } = editor.state;
      const block =
        selection instanceof NodeSelection
          ? { pos: selection.from, node: selection.node }
          : blockAt(doc, selection.from);
      if (!block) return;
      const measured = measure(block.pos, block.node);
      if (!measured) return;
      setHovered(measured);
      setMenuOpen(true);
    },
  }));

  if (!hovered) return null;
  const { pos, node } = hovered;

  function addBelow() {
    const isEmptyText = node.type.name === "paragraph" && node.content.size === 0;
    if (isEmptyText) {
      editor
        .chain()
        .focus()
        .insertContentAt(pos + 1, "/")
        .run();
      return;
    }
    const at = pos + node.nodeSize;
    editor
      .chain()
      .insertContentAt(at, { type: "paragraph", content: [{ type: "text", text: "/" }] })
      .focus(at + 2)
      .run();
  }

  function onDragStart(e: DragEvent) {
    startBlockDrag(editor.view, pos, node, e);
    setHovered(null);
  }

  /** Runs a command with the cursor inside this block. */
  function inBlock(run: (editor: Editor) => void) {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setSelection(Selection.near(tr.doc.resolve(pos + 1)));
        return true;
      })
      .run();
    run(editor);
  }

  function selectBlock() {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setSelection(NodeSelection.create(tr.doc, pos));
        return true;
      })
      .run();
  }

  const convertible =
    node.isTextblock ||
    ["bulletList", "orderedList", "taskList", "listItem", "taskItem", "blockquote"].includes(
      node.type.name,
    );
  const mod = isMac() ? "⌘" : "Ctrl ";
  const done = () => {
    setMenuOpen(false);
    setHovered(null);
  };

  return (
    <div
      className="absolute left-0 z-10 flex items-center gap-px transition-[top] duration-100 max-lg:hidden"
      style={{ top: hovered.top }}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={addBelow}
        aria-label="Add a block below"
        title="Add a block below"
        className="flex size-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-muted"
      >
        <Plus className="size-4" />
      </button>
      <Popover
        open={menuOpen}
        onOpenChange={(o) => {
          setMenuOpen(o);
          if (!o) setHovered(null);
        }}
        label="Block actions"
        align="start"
        className="w-60"
        trigger={
          <button
            type="button"
            tabIndex={-1}
            draggable
            onDragStart={onDragStart}
            onDragEnd={() => setHovered(null)}
            onClick={() => {
              selectBlock();
              setMenuOpen((o) => !o);
            }}
            aria-label="Drag to move, click for actions"
            title="Drag to move · Click for actions"
            className="flex h-7 w-5 cursor-grab items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-muted active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        }
      >
        {convertible && (
          <>
            <p className="px-2.5 pt-1 pb-1 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
              Turn into
            </p>
            {BLOCKS.filter((b) => b.convertible).map((b) => {
              const Icon = b.icon;
              const active = isKindAt(editor, pos, b.id);
              return (
                <MenuItem
                  key={b.id}
                  icon={<Icon />}
                  active={active}
                  hint={active ? <Check className="size-3.5 text-accent-ink" /> : undefined}
                  onSelect={() => {
                    done();
                    inBlock((e) => b.apply(e.chain().focus().clearNodes()).run());
                  }}
                >
                  {b.label}
                </MenuItem>
              );
            })}
            <MenuGap />
          </>
        )}
        <MenuItem
          icon={<Copy />}
          onSelect={() => {
            done();
            editor
              .chain()
              .focus()
              .insertContentAt(pos + node.nodeSize, node.toJSON())
              .run();
          }}
        >
          Duplicate
        </MenuItem>
        <MenuItem
          icon={<ArrowUp />}
          hint={`${mod}⇧↑`}
          onSelect={() => {
            done();
            selectBlock();
            moveBlock(-1)({ state: editor.state, dispatch: editor.view.dispatch });
          }}
        >
          Move up
        </MenuItem>
        <MenuItem
          icon={<ArrowDown />}
          hint={`${mod}⇧↓`}
          onSelect={() => {
            done();
            selectBlock();
            moveBlock(1)({ state: editor.state, dispatch: editor.view.dispatch });
          }}
        >
          Move down
        </MenuItem>
        <MenuGap />
        <MenuItem
          icon={<Trash2 />}
          tone="danger"
          onSelect={() => {
            done();
            editor
              .chain()
              .focus()
              .deleteRange({ from: pos, to: pos + node.nodeSize })
              .run();
          }}
        >
          Delete
        </MenuItem>
      </Popover>
    </div>
  );
}

/** Hands the block to ProseMirror's own drag-and-drop, which moves it to the drop cursor. */
function startBlockDrag(view: EditorView, pos: number, node: PmNode, e: DragEvent) {
  const selection = NodeSelection.create(view.state.doc, pos);
  view.dispatch(view.state.tr.setSelection(selection));
  const dom = view.nodeDOM(pos);
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", node.textContent);
  if (dom instanceof HTMLElement) e.dataTransfer.setDragImage(dom, 0, 0);
  view.dragging = { slice: selection.content(), move: true };
}

/** Whether the block at `pos` is of the given kind (checked without moving the cursor). */
function isKindAt(editor: Editor, pos: number, kind: string): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  const inner = node.type.name === "listItem" || node.type.name === "taskItem" ? null : node;
  const parent = editor.state.doc.resolve(pos).parent.type.name;
  switch (kind) {
    case "text":
      return inner?.type.name === "paragraph";
    case "h1":
    case "h2":
    case "h3":
      return inner?.type.name === "heading" && inner.attrs.level === Number(kind[1]);
    case "bullet":
      return parent === "bulletList" || node.type.name === "bulletList";
    case "numbered":
      return parent === "orderedList" || node.type.name === "orderedList";
    case "todo":
      return parent === "taskList" || node.type.name === "taskList";
    case "quote":
      return node.type.name === "blockquote";
    case "callout":
      return node.type.name === "callout";
    case "code":
      return node.type.name === "codeBlock";
    default:
      return false;
  }
}
