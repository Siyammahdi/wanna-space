# 0019 — Task covers and a shared asset trash

- Status: Accepted
- Date: 2026-10-09

## Context

Tasks are often about something visual: a design to review, a page to build, a photo of
the whiteboard. People asked for an image on the task's cards. A stored file per task
raises two questions the Vault answered for its own items but tasks hadn't met yet:
where the file lives, and how undo works when a cover is replaced, removed, or deleted
along with its task.

## Decision

- **`task.cover`** (`jsonb`, migration `0012`) holds the same stored-file description as
  `vault_item.asset` (`AssetJson`, now in `schema/assets.ts`): provider, public id,
  resource type, format, size, dimensions and filename. It is never a URL. `toItem` signs
  an 800px preview per request, and `TaskItem.cover` carries `{ id, url, width, height }`.
- **Uploads go straight to storage.** The browser uploads with signed fields from
  `prepareCoverUpload` (`lib/upload.ts`, shared with the Vault). Then `setTaskCover`
  verifies the signature, asks storage what arrived, and accepts only an image in a known
  format; anything else is deleted. Covers are top-level only, like stages and repeats.
- **`asset_trash`** is a small shared table (space, public id, asset, trashed_at) for
  files that were set aside rather than deleted:
  - Replacing or removing a cover, and deleting a task that has one, move the old file
    there in the same transaction as the change.
  - Undo and redo pass the public id back (`{ restore: id }`); the server takes the file
    out of the space's trash. It never trusts a client-sent asset.
  - Restoring a deleted task does the same through `coverId` on its snapshot.
  - Seven days later `purgeTrash` (run with `after()` on cover changes and deletes)
    deletes the file from storage and the row with it. Restoring after that brings the
    task back without its image.
- **Optimistic like every other task change.** `useTasks().setCover(id, file)` shows a
  local preview at once, with a spinner while it uploads, and the stored image replaces it
  on the same round trip. Failures toast, since the task panel may be covering the board's
  alert.
- **Where it shows.** Orbit cards get a 16:9 cover; Planner cards a 2:1 cover (they're
  narrower). List rows and Today's three show a small square thumbnail on the right. The
  task panel shows a banner with Change and Remove, or an "Image" property with "Add an
  image". You can also paste or drop an image anywhere on the panel.
- **Switched off without storage.** `features.uploads` reaches the client through
  `CapabilitiesProvider` in the app layout; without it the panel offers no image controls,
  and `toCover` returns null.

## Consequences

- Any future room that stores files (note images, project covers) can reuse
  `asset_trash` and the same restore-by-id undo, instead of a soft-delete column per
  table.
- Account deletion cascades the trash rows, task covers and vault items, but not the
  files in storage. That gap already existed for the Vault; it should be closed when
  account deletion is built.
- Production needs migration `0012` (with `0001`–`0011`) before this ships there.
