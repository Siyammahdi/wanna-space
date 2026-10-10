# 0013 — Vault: saved items, Cloudinary storage, and safe link previews

- Status: Accepted
- Date: 2026-10-08
- Amends: [0001](0001-tech-stack.md) (file storage)

## Context

The Vault keeps what inspires you: links with a preview, uploaded images and design files,
code snippets and quick notes, grouped into collections and tags and shown on a masonry
board with search. It needs file storage, link previews fetched by our server, and
dominant colors, and it must not let one user read another's files or turn our server
into a proxy for internal addresses.

ADR 0001 planned S3-compatible storage (Cloudflare R2). For now we want image transforms
(thumbnails, PDF/PSD/video posters), dominant colors and a free tier without running
anything ourselves.

## Decision

- **Cloudinary for now, behind `server/storage`.** It is the only module that knows the
  provider: signing uploads, verifying them, describing stored files, importing remote
  images, delivery URLs and deletes. Items store a provider-tagged `asset` JSON
  (`provider`, `publicId`, `resourceType`, format, version, size, dimensions, pages,
  filename), never a URL, so moving to R2/S3 means a new module plus a copy job.
- **Uploads are optional.** They turn on when `CLOUDINARY_URL` (or the three
  `CLOUDINARY_*` parts) is set (`features.uploads`); without it the Vault still saves
  links, notes and snippets, and the Upload button is hidden.
- **Private by default.** Files are uploaded as `type: authenticated` under
  `wanna-space/<spaceId>/`, so public URLs don't work. Every preview and download URL is
  signed on the server for an item the caller owns; downloads go through
  `/api/vault/[id]/download`, which checks ownership and redirects to a five-minute URL.
- **Signed direct uploads.** The browser asks `prepareUpload` for a signature (the public
  id is fixed to the caller's space folder) and posts the file straight to Cloudinary
  with progress. `createUpload` then verifies the response signature (constant time),
  checks that the public id is inside the caller's folder, and reads the file's real
  type, size, dimensions, pages and colors from the Admin API instead of trusting the
  client. Files over 10 MB are refused.
- **Link previews without a screenshot service.** `unfurl` reads `og:`/`twitter:`/meta
  tags and icons from the page's `<head>`. The share image is imported into storage
  (with colors) when uploads are on, otherwise hotlinked with `referrerpolicy=no-referrer`.
  A URL that is itself an image becomes an image item. Saving a URL that's already in the
  Vault returns the existing item.
- **SSRF guards on every fetch:** http(s) only, no credentials, every resolved address
  (and every redirect, at most four, followed by hand) must be public (private,
  loopback, link-local, CGNAT, multicast, IPv4-mapped IPv6), a six-second timeout and a
  1 MB cap, stopping at `</head>`. Known gap: DNS can change between our check and the
  connection (rebinding); closing it means pinning the checked address in a custom
  agent.
- **One table for every kind.** `vault_item` has a `kind` (link, image, file, snippet,
  note) and nullable per-kind columns; collections are a separate table and an item sits
  in at most one (`set null` when the collection goes). Tags are a `text[]` on the item,
  normalized (lowercase, dashes, ≤ 32 chars, ≤ 12 per item).
- **Soft delete, then purge.** Deleting sets `deleted_at` so Undo is instant; a week later
  the row is removed and its file destroyed, lazily, after a later delete in the same
  space (`after()`). Deleting a collection is a real delete; undo re-creates it with the
  same id and moves its items back.
- **Filtering on the client.** The page loads the newest 1,000 live items and filters by
  collection, kind, tag and text (accent-folded, every word) in the browser, so filters
  are instant and synced to the URL (`?c=&kind=&tag=&q=`). A generated `tsvector`
  column with a GIN index is ready for server search when a space outgrows that limit
  and for global search.
- **Masonry in JavaScript.** Cards are distributed greedily into columns by estimated
  height (known image ratios, text length), so reading order stays left to right and
  keyboard navigation follows the columns. Before measuring, CSS columns render the same
  cards so the first paint never waits for JavaScript.

## Consequences

- The Vault works without any storage keys; adding them only adds uploads and stored
  link images. Restart the dev server after adding them.
- Cloudinary limits (bandwidth, transformations, credits) apply; signed URLs are cached
  by the browser but each new size is a transformation.
- Files of a deleted account or space are not purged yet; account deletion must destroy
  the `wanna-space/<spaceId>/` folder when it ships.
- A screenshot fallback for pages without a share image, server search past 1,000 items,
  bulk actions and drag to reorder are later work.
