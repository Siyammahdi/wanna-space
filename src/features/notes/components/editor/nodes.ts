import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { moveBlock } from "./blocks";
import { PageLinkView } from "./page-link-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: { setCallout: () => ReturnType };
    pageLink: { insertPageLink: (id: string) => ReturnType };
  }
}

/** A tinted block with an emoji, for tips and warnings. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: "💡",
        parseHTML: (el) => el.getAttribute("data-emoji") || "💡",
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Backspace at the very start turns an empty callout back into text.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name || $from.parentOffset > 0) return false;
        return editor.commands.setParagraph();
      },
    };
  },
});

/** A link to another page, shown as a row with its icon and live title. */
export const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-page-id"),
        renderHTML: (attrs) => ({ "data-page-id": attrs.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-link" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },

  addCommands() {
    return {
      insertPageLink:
        (id) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { id } }, { type: "paragraph" }]),
    };
  },
});

/** `Mod+Shift+↑/↓` moves the block (or list item) at the cursor. */
export const BlockKeys = Extension.create({
  name: "blockKeys",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-ArrowUp": ({ editor }) =>
        moveBlock(-1)({ state: editor.state, dispatch: editor.view.dispatch }),
      "Mod-Shift-ArrowDown": ({ editor }) =>
        moveBlock(1)({ state: editor.state, dispatch: editor.view.dispatch }),
    };
  },
});
