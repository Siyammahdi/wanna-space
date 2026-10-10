# 0020 — Global search in the command palette

- Status: Accepted
- Date: 2026-10-10

## Context

The palette searched task titles on the server and matched page titles on the client, from
a list of every page loaded by the app layout on each request. Notes' text, task notes
and the Vault weren't searchable from anywhere but the Vault's own filter. "Where did I
put that?" should have one answer, from any room.

## Decision

- **One server action, three rooms.** `searchSpace` (`app/(app)/_actions/search.ts`)
  validates the query, splits it into words, and runs `searchTasks`, `searchPages` and
  `searchVault` in parallel. Each lives in its feature's `server/search.ts`
  (`server-only`, scoped through `requireSpace`) and returns `PaletteResult`s, the shape
  the palette defines, so `components/` still imports no feature.
- **Every word must match, anywhere in the item.** Tasks: title or notes. Pages: title or
  the document's text. Vault: title, body, URL, site, file name and tags. `ILIKE` with
  escaped patterns (`lib/search.ts`); title matches rank first, then each room's natural
  order (open and due-soon tasks, recently edited pages, newest saves). Up to 6 tasks, 5
  pages and 5 Vault items.
- **Page text is read at query time.** A jsonpath (`strict $.** ? (@.type == "text").text`)
  pulls every text node out of the stored Tiptap JSON, so there's no new column, no
  backfill and nothing to keep in sync. A personal space has hundreds of pages; when that
  stops being cheap, store the text on save and index it (trigram or `tsvector`).
- **Snippets explain body matches.** When the title doesn't contain every word, the
  result shows a line of the body around the first match; the palette highlights matched
  words in both.
- **Results open in place.** Tasks open their panel (`/tasks?task=`), pages navigate, and
  Vault items open the detail dialog via `/vault?item=` (dropped from the URL on close).
- The layout no longer loads every page for the palette.

## Consequences

- Page titles appear after the debounce and a round trip instead of instantly; in return
  the layout does one query less on every request, and page bodies are searchable.
- Matching is substring-based: no stemming, typo tolerance or accent folding yet.
- A Vault item older than the board's 1,000-item window is found but its dialog can't
  open until the board pages further back (see the Vault roadmap).
