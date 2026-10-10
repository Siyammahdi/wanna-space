import type { ChainedCommands, Editor, Range } from "@tiptap/core";
import type { Node as PmNode, ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, Selection, type EditorState, type Transaction } from "@tiptap/pm/state";
import {
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Type,
  type LucideIcon,
} from "lucide-react";

export type BlockKind = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string;
  /** The Markdown shortcut that makes this block, shown in the slash menu. */
  markdown?: string;
  /** Applies the block type at the selection (the block has been cleared of wrappers). */
  apply: (chain: ChainedCommands) => ChainedCommands;
  /** Kinds a block can be turned into from its handle menu. */
  convertible: boolean;
};

export const BLOCKS: BlockKind[] = [
  {
    id: "text",
    label: "Text",
    description: "Just start writing",
    icon: Type,
    keywords: "paragraph plain",
    apply: (c) => c.setParagraph(),
    convertible: true,
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    keywords: "title h1 large",
    markdown: "#",
    apply: (c) => c.setHeading({ level: 1 }),
    convertible: true,
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: "subtitle h2",
    markdown: "##",
    apply: (c) => c.setHeading({ level: 2 }),
    convertible: true,
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    keywords: "h3 small",
    markdown: "###",
    apply: (c) => c.setHeading({ level: 3 }),
    convertible: true,
  },
  {
    id: "bullet",
    label: "Bulleted list",
    description: "A simple list",
    icon: List,
    keywords: "ul unordered points",
    markdown: "-",
    apply: (c) => c.toggleBulletList(),
    convertible: true,
  },
  {
    id: "numbered",
    label: "Numbered list",
    description: "A list with numbers",
    icon: ListOrdered,
    keywords: "ol ordered steps",
    markdown: "1.",
    apply: (c) => c.toggleOrderedList(),
    convertible: true,
  },
  {
    id: "todo",
    label: "To-do list",
    description: "Track things to do",
    icon: ListChecks,
    keywords: "task checkbox check checklist",
    markdown: "[]",
    apply: (c) => c.toggleTaskList(),
    convertible: true,
  },
  {
    id: "quote",
    label: "Quote",
    description: "Set a passage apart",
    icon: Quote,
    keywords: "blockquote citation",
    markdown: ">",
    apply: (c) => c.setBlockquote(),
    convertible: true,
  },
  {
    id: "callout",
    label: "Callout",
    description: "Make a note stand out",
    icon: Lightbulb,
    keywords: "note tip info highlight box",
    apply: (c) => c.setCallout(),
    convertible: true,
  },
  {
    id: "code",
    label: "Code",
    description: "A block of code",
    icon: Code2,
    keywords: "snippet pre monospace",
    markdown: "```",
    apply: (c) => c.setCodeBlock(),
    convertible: true,
  },
  {
    id: "divider",
    label: "Divider",
    description: "Separate sections",
    icon: Minus,
    keywords: "hr rule line separator",
    markdown: "---",
    apply: (c) => c.setHorizontalRule(),
    convertible: false,
  },
];

export const PAGE_BLOCK = {
  id: "page",
  label: "Page",
  description: "A page inside this one",
  icon: FileText,
  keywords: "subpage new page link nested",
};

export type SlashItem = Pick<BlockKind, "id" | "label" | "description" | "icon" | "markdown"> & {
  run: (editor: Editor, range: Range) => void;
};

/** Ranks by label prefix, word start, then keyword or substring match. */
export function matchBlocks<T extends { label: string; keywords?: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const score = (item: T) => {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) return 0;
    if (label.split(/\s+/).some((w) => w.startsWith(q))) return 1;
    if (`${label} ${item.keywords ?? ""}`.includes(q)) return 2;
    return -1;
  };
  return items
    .map((item) => [item, score(item)] as const)
    .filter(([, s]) => s >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([item]) => item);
}

/* Blocks for the handle and for moving ------------------------------------------------- */

const LISTS = new Set(["bulletList", "orderedList", "taskList"]);

/**
 * The depth of the "block" a position belongs to: the top-level node, or for lists the
 * item (so items move one at a time, like Notion).
 */
export function blockDepth($pos: ResolvedPos): number {
  if ($pos.depth < 1) return 0;
  let d = 1;
  while (d < $pos.depth && LISTS.has($pos.node(d).type.name)) d += 1;
  return d;
}

/** Start position and node of the block containing `pos` (or the top-level leaf at it). */
export function blockAt(doc: PmNode, pos: number): { pos: number; node: PmNode } | null {
  const $pos = doc.resolve(pos);
  if ($pos.depth === 0) {
    const node = $pos.nodeAfter;
    return node ? { pos, node } : null;
  }
  const d = blockDepth($pos);
  return { pos: $pos.before(d), node: $pos.node(d) };
}

/** Swaps the block at the selection with its previous (-1) or next (+1) sibling. */
export function moveBlock(dir: -1 | 1) {
  return ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
    const { selection } = state;
    const block =
      selection instanceof NodeSelection
        ? { pos: selection.from, node: selection.node }
        : blockAt(state.doc, selection.from);
    if (!block) return false;
    const $start = state.doc.resolve(block.pos);
    const parent = $start.parent;
    const index = $start.index();
    const target = index + dir;
    if (target < 0 || target >= parent.childCount) return false;
    if (!dispatch) return true;

    const { node } = block;
    const start = block.pos;
    const end = start + node.nodeSize;
    const sibling = parent.child(target);
    const offset = selection.from - start;
    const tr = state.tr;
    let newStart: number;
    if (dir < 0) {
      newStart = start - sibling.nodeSize;
      tr.delete(start, end).insert(newStart, node);
    } else {
      const after = end + sibling.nodeSize;
      tr.insert(after, node).delete(start, end);
      newStart = after - node.nodeSize;
    }
    tr.setSelection(
      selection instanceof NodeSelection
        ? NodeSelection.create(tr.doc, newStart)
        : Selection.near(tr.doc.resolve(Math.min(newStart + offset, tr.doc.content.size))),
    );
    dispatch(tr.scrollIntoView());
    return true;
  };
}
