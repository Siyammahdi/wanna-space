# Data model

Status: platform tables (auth, spaces) are **live** (migration `drizzle/0000_init.sql`);
room tables are drafts refined as each room is built. Source of truth for live tables:
`src/server/db/schema/`.

## Core ideas

1. **Everything belongs to a space.** Each user gets one personal space at sign-up. Every
   domain row carries `space_id`. Shared spaces later are then a membership table, not a
   migration of every table.
2. **Separate tables per room, plus shared connective tissue.** Rooms have different shapes
   (a task isn't a vault item), so each gets its own table. Tags and cross-room links are
   generic.
3. **Time-sortable IDs.** `uuid` primary keys defaulting to Postgres 18's `uuidv7()` —
   sortable, safe to expose, no sequence contention. Auth tables use the same scheme.
4. **Timestamps** are `timestamptz`; `updated_at` is maintained by Drizzle (`$onUpdate`).
   Column names are snake_case in SQL, camelCase in TypeScript.
5. **Fractional ordering.** User-ordered lists use a string `sort_key` (fractional index) so
   a reorder touches one row.
6. **Soft archive, hard delete.** `archived_at` for things users may want back; real
   deletes for everything else (and for account deletion).

## Entities

```
user ─┬─ session / account / verification     (managed by Better Auth)
      ├─ user_settings                         (account preferences, 0..1 row)
      └─ space_member ── space
                           ├── project ─┬ project_stage   (orbit board columns)
                           │            └ task (parent_id → task for subtasks, stage_id → project_stage)
                           ├── time_block           (planner)
                           ├── time_entry           (time tracking, optional task_id)
                           ├── day_plan             (today: intention, up to three task ids)
                           ├── page ── (content JSON)   (notes)
                           ├── vault_collection ── vault_item   (vault)
                           ├── asset_trash          (removed files, kept a week for undo)
                           ├── tag ── tagging (tag_id, entity_type, entity_id)
                           └── link (from_type, from_id, to_type, to_id)
```

### Live tables (Phase 1)

| Table          | Key columns                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `user`         | id, name, email (unique), email_verified, image, created_at, updated_at                                |
| `session`      | id, user_id → user (cascade), token (unique), expires_at, ip_address, user_agent                       |
| `account`      | id, user_id → user (cascade), provider_id (`credential` / `google`), account_id, password hash, tokens |
| `verification` | id, identifier, value, expires_at                                                                      |
| `rate_limit`   | id, key, count, last_request                                                                           |
| `space`        | id, name, kind (`personal`), created_at, updated_at                                                    |
| `space_member` | (space_id, user_id) PK, both cascade; role (`owner`), created_at                                       |

A personal space ("{FirstName}’s space") and an owner membership are created in one
transaction when a user is created (`server/spaces.ts`). The DAL recreates it if missing.

### Settings (migration `0005`)

| Table           | Key columns                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_settings` | user_id PK → user (cascade), week_starts_on (`smallint` 0 Sun … 6 Sat, default 6, check 0–6), time_format (`12h`/`24h`, default `12h`), updated_at |

Per user, not per space: these describe how the person reads their data. No row means
the defaults; the first change upserts one. Device-only preferences (theme, motion,
keyboard hints, the timer chime) never reach the database. See ADR
[0010](decisions/0010-settings.md).

Migration `0007` adds the focus timer settings: focus_minutes (default 25, check 5–180),
short_break_minutes (5, 1–60), long_break_minutes (15, 1–90), long_break_every (4, 2–12).

Migration `0009` adds: start_room (room id, default `today`), hidden_rooms (`text[]`),
capture_project_id → project (set null; quick capture's default project), default_stages
(`text[]`, default To do / In progress / Review; 1–8 names), auto_start_focus (boolean),
daily_focus_goal (minutes, 0 = none, check 0–720). See ADR
[0015](decisions/0015-settings-and-split-view.md).

### Time (migration `0007`)

| Table          | Key columns                                                                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time_entry`   | id, space_id → space (cascade), user_id → user (cascade), task_id → task (set null), source (`pomodoro` / `stopwatch` / `manual`), started_at, ended_at (≥ started_at), seconds (focused time, check 1–86400), note, created_at                                       |
| `active_timer` | user_id PK → user (cascade), space_id → space (cascade), mode (`pomodoro` / `stopwatch`), phase (`focus` / `short_break` / `long_break`), task_id → task (set null), note, run_started_at (null = paused or idle), elapsed_ms, session_started_at, rounds, updated_at |

Indexes: `time_entry (space_id, started_at)` for reports, `time_entry (task_id)`.

- **Entries** are attributed to the local day they started on (`started_at at time zone
tz`); `seconds` excludes pauses. Deleting a task keeps its time, unattached.
- **The timer** is one row per user; no row means an idle pomodoro. Nothing ticks in the
  database: elapsed time is `elapsed_ms + (now − run_started_at)`. `updated_at` doubles as
  a version so clients can ignore stale copies. See ADR
  [0012](decisions/0012-time-tracking.md).

### Live tables (Phase 2, migrations `0001`–`0004`)

| Table     | Key columns                                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | id, space_id → space (cascade), name, keyword, color (palette key, default `fern`), sort_key, archived_at                                                                                                                                                                                               |
| `task`    | id, space_id → space (cascade), project_id → project (set null), parent_id → task (cascade), title, notes, status (`open`/`done`), priority (0 none, 1 highest … 3), due_date (floating `date`), due_time (floating `time`), repeat (`jsonb` rule), cover (`jsonb` stored file), completed_at, sort_key |

Indexes: `task (space_id, status, due_date)` for list views, `task (project_id)`,
`project (space_id)`.

- **Ordering**: `sort_key` is a fractional index (`fractional-indexing`). Always compare it
  with `collate "C"` (byte order); the default locale collation orders mixed-case keys
  wrongly. New tasks are appended after the space's current maximum key. Boards sort by
  date, then time, then `sort_key`, so the manual order applies among tasks due at the
  same moment; dragging computes the new key on the client between the neighbours'
  keys and saves it through `updateTask` (ADR [0008](decisions/0008-manual-task-order.md)).
- **IDs**: task IDs are UUIDv7 generated on the client (`lib/id.ts`) so an optimistic row
  keeps its identity once persisted.
- **Dates**: see ADR [0006](decisions/0006-dates-and-time-zones.md).
- **Recurring tasks** keep one row whose `due_date` rolls forward on completion; `repeat`
  is only set alongside a due date and never on subtasks. See ADR
  [0007](decisions/0007-recurring-tasks.md).
- **Covers** (migration `0012`): `cover` (`jsonb`, the same stored-file shape as
  `vault_item.asset`) is an image on the task's cards, top-level tasks only. See
  [Asset trash](#asset-trash-migration-0012) and ADR
  [0019](decisions/0019-task-covers.md).
- **Project color** stores a palette key (`features/tasks/projects.ts`), never a raw color,
  so it follows the theme. Unknown keys render as `fern`.
- **Deleting a project** keeps its tasks: `project_id` is set to null and they land in the
  Inbox. Every action re-checks that a referenced project belongs to the caller's space.

- **Subtasks** are tasks with `parent_id` set, one level deep (enforced in actions). List
  views, counts, and the Today lane only consider top-level tasks; boards load the
  subtasks of the listed tasks in one extra query. Deleting a task cascades to its
  subtasks; `deleteTask` returns all of them so undo can restore the group.
- **Due time** is optional, only meaningful with a due date, and floating like it
  (clearing the date clears the time).

### Orbit (migration `0009`)

| Table           | Key columns                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`       | + icon (one emoji, nullable), description (the brief, ≤ 2000 chars), status (`planning` / `active` / `paused` / `complete`), target_date (`date`) |
| `project_stage` | id, space_id → space (cascade), project_id → project (cascade), name, sort_key, wip_limit (nullable, check 1–99), created_at, updated_at          |
| `task`          | + stage_id → project_stage (set null)                                                                                                             |

Indexes: `project_stage (project_id)`, `task (stage_id)`.

- **Stages** are a project's board columns, ordered by `sort_key`; Done is not a stage but
  `status = 'done'`. New projects get the creator's `default_stages`; the migration
  backfilled To do / In progress / Review for existing projects.
- **`stage_id` is only a hint.** An open task whose stage is null or from another project
  shows in the project's first stage. Changing a task's project clears it; deleting a
  stage sets it null (undo restores it).
- **Health and progress** are derived from task counts, never stored. See ADR
  [0014](decisions/0014-orbit-project-boards.md).

### Project keywords (migration `0010`)

`project.keyword`: lowercase letters and digits, 2–12 characters, unique per space
(`project_space_keyword_idx` on `space_id, keyword`). Assigned from the name when a project
is created ("TechWitPro" → `twp`); the migration backfilled existing projects with the same
rules. Typing it in quick add files the task in that project. See ADR
[0016](decisions/0016-project-keywords.md).

### Notes (migration `0006`)

| Table  | Key columns                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page` | id, space_id → space (cascade), parent_id → page (cascade), title, icon (one emoji, nullable), content (`jsonb` Tiptap document), excerpt (plain text, ≤ 280 chars), sort_key, created_at, updated_at |

Indexes: `page (space_id, parent_id)` for the tree, `page (space_id, updated_at)` for
"Recently edited".

- **Tree**: a page with `parent_id` null is top-level. The whole tree (no documents) is one
  query; the client builds it. Siblings order by `sort_key` (`collate "C"`); new pages go
  last.
- **Documents** are Tiptap JSON, validated as `{ type: "doc", content?: [...] }` and capped
  at 512 KB. `excerpt` is derived from the document on every save (for cards and future
  search) and never edited directly.
- **Deleting** a page cascades to its subpages. `deletePage` returns the whole subtree
  (parents first) so undo can re-insert it; if the old parent is gone by then, the page
  comes back at the top level.
- **Inline subpages** are `pageLink` nodes in the parent's document holding the child's
  id; the child's `parent_id` is the source of truth for nesting.

See ADR [0011](decisions/0011-notes-editor.md).

### Vault (migration `0008`)

| Table              | Key columns                                                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vault_collection` | id, space_id → space (cascade), name, sort_key, created_at, updated_at                                                                                                                                                                                                                                                   |
| `vault_item`       | id, space_id → space (cascade), collection_id → vault_collection (set null), kind (`link` / `image` / `file` / `snippet` / `note`), title, body, url, site_name, icon_url, preview_url, language, asset (`jsonb`), colors (`text[]`), tags (`text[]`), search (generated `tsvector`), deleted_at, created_at, updated_at |

Indexes: `vault_item (space_id, created_at)` for the board, `vault_item (collection_id)`,
GIN on `search` and on `tags`, `vault_collection (space_id)`.

- **One table for every kind**; per-kind columns are nullable. `body` is a note's text, a
  snippet's code, or the user's own notes on anything else. `url` is a link's final URL
  (after redirects); `preview_url` is a hotlinked share image, used only when it couldn't
  be stored.
- **`asset`** describes a stored file (an upload, or a link's imported share image):
  provider, public id, resource type, format, version, bytes, width, height, pages,
  original filename. Never a URL: delivery URLs are signed per request
  (`server/storage`).
- **`colors`** are up to five `#RRGGBB` values, most prominent first, from storage
  analysis. **`tags`** are normalized (lowercase, dashes, ≤ 32 chars, ≤ 12 per item).
- **Deleting** an item sets `deleted_at` (undo clears it); rows deleted over a week ago
  are removed with their files. Deleting a collection is a real delete; its items become
  unsorted, and undo re-creates it with the same id and moves them back.
- **`search`** covers title, body, URL, site name and filename (`simple` config); it is
  reserved for server and global search, while the room filters in the browser.

See ADR [0013](decisions/0013-vault-and-storage.md).

### Asset trash (migration `0012`)

| Table         | Key columns                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `asset_trash` | id, space_id → space (cascade), public_id, asset (`jsonb`), trashed_at (now) |

Unique index `asset_trash (space_id, public_id)`; index on `trashed_at`.

- **Files set aside, not deleted.** Replacing or removing a task's cover, or deleting a
  task that has one, moves the file here in the same transaction. Undo, redo and task
  restore take it back out by public id, scoped to the space (`server/asset-trash.ts`).
- **Purged after a week:** `purgeTrash` removes the rows and deletes their stored files. It runs
  with `after()` on cover changes and deletes.

### Today (migration `0011`)

| Table      | Key columns                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `day_plan` | id, space_id → space (cascade), date (floating `date`), intention (≤ 140 chars), focus_task_ids (`uuid[]`, at most 3), created_at, updated_at |

Unique index `day_plan (space_id, date)`; both columns are written with an upsert on it.

- **One row per day, only once something is set.** No row means no intention and no
  picks. Old rows are never read again (the room only asks for today).
- **`focus_task_ids` has no foreign key.** Reads drop ids whose task is gone; writes
  check every id is a top-level task in the caller's space. See ADR
  [0018](decisions/0018-today-room.md).

Planned additions: tags across rooms.
