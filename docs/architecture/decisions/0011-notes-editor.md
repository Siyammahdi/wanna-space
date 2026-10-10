# 0011 — Notes: nested pages with a Tiptap block editor

- Status: Accepted
- Date: 2026-10-08

## Context

The Notes room needs Notion-like writing: blocks, a slash menu, Markdown shortcuts, nested
pages, and autosave, without a collaboration server. It has to feel calm, work as well
with a mouse as with the keyboard, and keep the "first paint never waits for JavaScript"
rule.

## Decision

- **Editor: Tiptap v3 (MIT packages only)** on ProseMirror: `@tiptap/react`,
  `starter-kit` (paragraphs, headings, lists, quote, code, divider, link, underline, undo,
  drop cursor), `extension-list` (to-dos), `extension-highlight`, `extensions`
  (placeholder, character count) and `suggestion` (the slash menu). The official drag
  handle was skipped because it pulls in the Yjs collaboration stack; our handle is
  custom (`editor/block-handle.tsx`) and uses ProseMirror's own drag-and-drop.
- **Custom nodes** (`editor/nodes.ts`): `callout` (emoji + text), `pageLink` (an inline
  subpage, rendered with the page's live icon and title from the notes context), and
  `blockKeys` (`⌘⇧↑/↓` moves blocks; list items move one at a time).
- **Storage:** one `page` row per page; the document is Tiptap JSON in `jsonb`, with a
  derived plain-text `excerpt`. No block table: the editor's document is the unit we read
  and write, and per-block rows would only matter for collaboration or block-level links.
- **Saving:** title and icon go through `updatePage` immediately (optimistic in the tree)
  and refresh the route. The document autosaves: 700 ms debounce, one request at a time,
  the newest document wins, failures keep the document queued and show "Not saved ·
  Retry", and leaving the page flushes. The document is turned into plain JSON before
  it's sent, since ProseMirror attribute objects aren't plain objects and server actions
  would drop them.
- **First paint:** the editor mounts on the client (`immediatelyRender: false`); until
  then `DocPreview` renders the same document with the same `.ws-prose` styles on the
  server, so the page reads before hydration.
- **Tree state** (which branches are open) is per device in `localStorage`, like other
  view preferences.
- **Entry points:** the tree, the Notes home, the palette's "New page" (a server action
  that creates and redirects, so it works from any room), and the slash menu's "Page"
  (creates a subpage and links it inline).

## Consequences

- No real-time collaboration; two tabs editing one page resolve as last write wins. Moving
  to Yjs later would change the storage format (document updates instead of JSON).
- Backlinks and `[[` links can be built by indexing `pageLink` nodes (and future
  mention nodes) from the JSON on save.
- Full-text search can start from `excerpt`/document text with Postgres `tsvector`.
