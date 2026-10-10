import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";

import type { SlashItem } from "./blocks";

export type SlashState = {
  open: boolean;
  items: SlashItem[];
  index: number;
  rect: DOMRect | null;
  query: string;
};

const CLOSED: SlashState = { open: false, items: [], index: 0, rect: null, query: "" };

/** Bridges the suggestion plugin (outside React) and the menu component. */
export function createSlashStore() {
  let state = CLOSED;
  let command: ((item: SlashItem) => void) | null = null;
  let editor: Editor | null = null;
  const listeners = new Set<() => void>();
  const set = (next: SlashState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const sync = (p: SuggestionProps<SlashItem, SlashItem>) => {
    command = p.command;
    editor = p.editor;
    const sameQuery = p.query === state.query;
    set({
      open: true,
      items: p.items,
      index: sameQuery ? Math.min(state.index, Math.max(p.items.length - 1, 0)) : 0,
      rect: p.clientRect?.() ?? null,
      query: p.query,
    });
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => state,
    getServer: () => CLOSED,
    start: sync,
    update: sync,
    exit() {
      command = null;
      set(CLOSED);
    },
    select(index: number) {
      const item = state.items[index];
      if (item && command) command(item);
    },
    hover(index: number) {
      if (index !== state.index) set({ ...state, index });
    },
    dismiss() {
      if (editor) exitSuggestion(editor.view, slashKey);
      set(CLOSED);
    },
    keyDown(event: KeyboardEvent): boolean {
      if (!state.open) return false;
      const n = state.items.length;
      if (event.key === "ArrowDown" && n) {
        set({ ...state, index: (state.index + 1) % n });
        return true;
      }
      if (event.key === "ArrowUp" && n) {
        set({ ...state, index: (state.index - 1 + n) % n });
        return true;
      }
      if ((event.key === "Enter" || event.key === "Tab") && n) {
        this.select(state.index);
        return true;
      }
      if (event.key === "Escape") {
        this.dismiss();
        return true;
      }
      return false;
    },
  };
}

export type SlashStore = ReturnType<typeof createSlashStore>;

export const slashKey = new PluginKey("slash-command");

type SlashOptions = {
  store: SlashStore | null;
  items: (query: string) => SlashItem[];
};

export const SlashCommand = Extension.create<SlashOptions>({
  name: "slashCommand",

  addOptions() {
    return { store: null, items: () => [] };
  },

  addProseMirrorPlugins() {
    const { store, items } = this.options;
    if (!store) return [];
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        allowSpaces: true,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return $from.parent.type.name !== "codeBlock";
        },
        items: ({ query }) => (query.length > 24 ? [] : items(query)),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) =>
          props.run(editor, range),
        render: () => ({
          onStart: (p) => store.start(p),
          onUpdate: (p) => store.update(p),
          onExit: () => store.exit(),
          onKeyDown: ({ event }) => store.keyDown(event),
        }),
      }),
    ];
  },
});
