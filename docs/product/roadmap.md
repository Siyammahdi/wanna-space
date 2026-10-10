# Roadmap

Built in vertical slices: each phase ships something usable end to end and is reviewed
before the next begins. Status: ✅ done · 🔨 in progress · ⏳ next · 💭 later.

## Phase 0 — Foundation ✅

- [x] `src/` layout, route groups for marketing / app / internal
- [x] Design tokens (OKLCH, light + dark, room hues, elevation, motion)
- [x] Identity revision: Frosted Fern palette, Bricolage Grotesque + Figtree, no small
      shadows, tone over borders (ADR 0004)
- [x] UI primitives: Button, Badge, Card, Kbd
- [x] App shell: sidebar with animated active state, mobile nav, theme switcher (no flash)
- [x] Room registry (`src/config/rooms.ts`) driving nav, landing, and design reference
- [x] Room-to-room view transitions (React `<ViewTransition>`)
- [x] Signature interaction: task completion check
- [x] Living design reference at `/design`
- [x] Docs: vision, roadmap, architecture, ADRs, design system
- [x] Tooling: typecheck, ESLint, Prettier (+ Tailwind class sorting), typed routes

## Phase 1 — Platform 🔨

Goal: a real user can sign up, sign in, and land in their own empty space.

- [x] Neon Postgres project (dev + prod branches) and Drizzle ORM with migrations
- [x] Environment validation (fail fast on missing config)
- [x] Better Auth: email + password with verification, sessions, rate limiting (ADR 0005)
- [x] Transactional email via Resend + react-email (console fallback in dev)
- [x] Sign-in / sign-up / forgot / reset / verify-email screens in the design language
- [x] `proxy.ts` optimistic redirects + a server-side data access layer that checks every request
- [x] Personal space created on sign-up; all data scoped to it
- [x] App shell shows the real user; sign out
- [x] Shared primitives: Input, PasswordInput, Field, Alert, Spinner
- [ ] Google OAuth credentials (code ready; enabled when env vars are set)
- [ ] Resend API key + verified sending domain
- [ ] Migrate the `production` branch
- [ ] CI on GitHub Actions (typecheck, lint, build) and Vercel deploy (`sin1`)
- [x] Toast primitive
- [x] Settings dialog (`⌘,` / `Ctrl+,`, the sidebar, the account menu, or the palette)
      (ADR 0010): week start and time format synced to the account; theme, reduce
      motion, and keyboard hints per device; a shortcuts reference; name, password reset
      link, sign out of other devices; JSON export of every project, task, page and
      time entry; focus timer lengths (synced)
- [x] Settings grouped into Preferences, Rooms, Account and Help (ADR 0015): start page
      (`/start`), rooms shown in the sidebar, notification sounds with previews, quick
      capture's default project, default board stages, focus auto-start and a daily
      goal, active sessions with sign-out, password change, space stats
- [ ] Delete account (needs a confirmation flow and Better Auth's `deleteUser`)

## Phase 2 — Tasks 🔨

Slice 1 ✅ — a usable task list:

- [x] Tasks + projects schema; fractional ordering (`sort_key`, byte-order collation)
- [x] Floating due dates with "today" in the user's time zone (ADR 0006)
- [x] Quick add with natural-language dates and priorities (“Pay rent fri p1”), live chips
- [x] Sections: Overdue, Today, Upcoming, No date, Completed (collapsible)
- [x] Complete with the signature check animation; inline title edit; date and priority
      menus; delete
- [x] Optimistic updates for every change (`useOptimistic` + Server Actions + `refresh()`)
- [x] Today room's "Due today" lane wired to real tasks

Slice 2 ✅ — projects and capture from anywhere:

- [x] Projects: pill nav (All, Inbox, projects with counts), inline create, project page
      with rename, color, and delete (tasks fall back to the Inbox)
- [x] Move tasks between projects (row menu or `#project` in quick add); project label on
      rows in the All view
- [x] Global quick capture: `C` anywhere, the sidebar button, or the mobile capture button
      opens a dialog; on Tasks pages it focuses the inline add bar instead

Slice 3 ✅ — undo:

- [x] Every task change is undoable with `⌘Z` / `Ctrl+Z` (add, complete, reopen, rename,
      date, priority, move, delete — deletes restore in place)
- [x] Completing, moving, deleting, and capturing show a toast with an Undo button

Slice 4 ✅ — task details and redo:

- [x] Detail panel (click a task): title, due date + time, priority, project, notes,
      subtasks with progress, delete
- [x] Subtasks (`parent_id`, one level; deleting a task removes them, undo restores them)
- [x] Due times (`due_time`), also parsed in quick add (“5pm”, “at 9:30am”, “17:00”)
- [x] Redo with `⇧⌘Z` / `Ctrl+Shift+Z` / `Ctrl+Y`; the "Undone" toast offers Redo

Slice 5 ✅ — keyboard first:

- [x] Keyboard navigation on task lists: `j`/`k` (or arrows) move a gliding cursor, `x`
      completes, `e` renames, `Enter` opens the panel (then `j`/`k` flip through tasks),
      `1`–`3`/`0` set priority, `Delete` deletes (undoable), `Esc` clears
- [x] Command palette (`⌘K` / `Ctrl+K`, the sidebar's Search, or the mobile header): jump
      to rooms, the Inbox, and projects; search tasks by title (opens the task's panel via
      `?task=`); new task; switch theme

Slice 6 ✅ — recurring tasks and a clearer row:

- [x] Recurring tasks (`repeat`): set in quick add (“every mon and thu”, “daily”,
      “monthly on the 1st”) or the panel's Repeat property; completing one rolls it to the
      next occurrence and reopens its subtasks, in one undoable step (ADR 0007)
- [x] Every action is reachable by mouse as well as keyboard: the whole row opens the
      panel (chevron on hover), hover shows Rename, Due date and a ⋯ menu (Open, Rename,
      Complete, Priority, Move to, Delete, each with its shortcut); right-click or the
      menu key opens the same menu
- [x] Today's "Due today" list uses the same rows, keyboard cursor, and detail panel
- [x] Menus take focus when opened, walk with the arrow keys, and hand focus back

Slice 7 ✅ — drag to reorder:

- [x] Drag tasks to reorder (mouse, or long-press on touch); dropping into another section
      changes the date (Today, No date, an Upcoming day), with Undo; empty sections become
      drop zones while dragging (ADR 0008)
- [x] `Alt`/`⌥` + `↑`/`↓` moves the cursor's task with the same rules

Slice 9 ✅ — project keywords (ADR 0016):

- [x] Every project has a short keyword, assigned from its name ("TechWitPro" → `twp`)
      and editable in the project header, the Orbit board header, or Settings → Tasks
- [x] Typing the keyword in any add bar ("Fix the header twp", or `#twp`) files the task
      in that project; dates and priorities can't be keywords

Slice 9 ✅ — task covers (ADR 0019):

- [x] An image on a task (`task.cover`, migration `0012`): pick, paste or drop it in the
      task panel; change or remove it, all undoable (removed files wait a week in
      `asset_trash`)
- [x] Covers on Orbit and Planner cards; a thumbnail on list rows and Today's three

Next slices:

- [ ] Undo for project rename/delete; tags
- [ ] Archive projects; reorder projects
- [ ] Reorder subtasks
- [ ] Recurring: end dates, completion history

Slice 8 ✅ — split view (ADR 0015):

- [x] Opening a task on a wide screen splits the page: the list glides into the left half
      and the panel takes the right half, without covering anything; phones keep the sheet

## Phase 2b — Orbit (project boards) 🔨

Slice 1 ✅ — projects as boards (ADR 0014):

- [x] `project_stage` table, `task.stage_id`, and project icon, brief, status and target
      date (migration `0009`, existing projects backfilled with default stages)
- [x] Overview: every project as a card with its orbit ring, status, health, stage bar,
      counts and target; filter by status; create a project
- [x] Board per project: custom stages plus a built-in Done; add, rename, reorder, delete
      (undoable) stages; optional WIP limits
- [x] Drag cards between and within stages (mouse or touch), or `Alt` + arrows; dropping
      in Done completes, dragging out reopens; every move undoable
- [x] Add tasks in a stage (quick-add grammar) or pull them in from the Inbox; the same
      card menu and detail panel (with a Stage property) as Tasks
- [x] Edit the brief, emoji, status, target date and color in place; health derived from
      the target and overdue work
- [x] Project pages in Tasks link to their board; boards in the command palette

Next:

- [ ] Swimlanes (by priority or due date); filters on the board
- [ ] Milestones; a timeline view of targets
- [ ] Archive landed projects

## Phase 3 — Today + Planner 🔨

Planner slice 1 ✅ — the week board (ADR 0009):

- [x] Week of seven day columns (Saturday by default; Sunday or Monday in Settings), with
      prev / next / This week
- [x] Unscheduled tray: Overdue and No date; past days show what got done
- [x] Drag tasks onto days, back to No date, or up and down a day; the same card, menu,
      and detail panel as Tasks; every move undoable
- [x] Add a task to any day (quick-add grammar; the day is the default date)
- [x] Keyboard: `Alt` + `←`/`→` moves a task a day, `Alt` + `↑`/`↓` reorders, `x`, `⌫`,
      `1`–`3`, menu key on the focused card

Planner slice 2 ✅ — a denser board:

- [x] One toolbar: week label, planned / done counts, Unscheduled toggle, week links
- [x] Unscheduled as a strip above the week (a sticky rail from 1536px), with "Move
      overdue to today" as one undoable step
- [x] Day counts and progress lines; columns fill the viewport; phones get an agenda

Next:

- [ ] Time blocks: an hour grid per day, drag to schedule (schema change)
- [ ] Scheduled time blocks on Today (after time blocks)
- [x] Week start as a user setting

Today slice ✅ — the day at a glance (ADR 0018):

- [x] Daily planning ritual: pick today's three (due tasks first, search, or create one),
      tick them off, or start a focus session on one; removing a pick is undoable
- [x] A one-line intention for the day; a progress ring for today's list
- [x] One live task list: Overdue (with "Move all to today", undoable), Today, and a
      collapsible Done today; quick add defaults to today; the same rows, keyboard and
      detail panel as Tasks
- [x] Beside the tasks: the focus timer with today's sessions and goal, and timed tasks
      with a "now" line and tomorrow's count; below: projects needing attention, recent
      pages, and recent Vault saves, all on one grid aligned with today's three

## Phase 4 — Time 🔨

Slice 1 ✅ — focus timer and time tracking (ADR 0012):

- [x] `time_entry` and `active_timer` tables; timer lengths in `user_settings`
- [x] Focus timer: pomodoro (focus, short and long breaks, rounds) or an open stopwatch,
      linked to a task with a note; held on the server, so it survives reloads and follows
      you between tabs and devices; phases that end while you're away are logged at their
      real end time
- [x] Start / pause with a click or `Space`; finish (logs it, undoable), discard, skip a break
- [x] The running timer in the sidebar and mobile header, and in the tab title
- [x] A chime (per-device switch), a toast and an optional system notification when a
      phase ends
- [x] Log time by hand (task, day, start, duration, note); delete entries with undo
- [x] Reports: today (total, sessions, a 24-hour strip, top tasks) and any week (total,
      daily average, best day, a bar per day, time per task)

Next:

- [ ] Edit entries; tags; reports by project
- [ ] Start a focus session from a task (row menu, detail panel, Planner card)
- [x] Auto-start the next focus round (setting)
- [x] Daily focus goal with progress on the day summary
- [ ] Idle detection

## Phase 5 — Vault 🔨

Slice 1 ✅ — the Vault board (ADR 0013):

- [x] `vault_item` and `vault_collection` tables (migration `0008`)
- [x] Save links: title, description, site, icon and share image fetched on the server
      with SSRF guards; the share image is stored with its dominant colors when uploads
      are on (no screenshots yet); duplicates open the existing item
- [x] Uploads (images, PDFs, design files, video, any file up to 10 MB) straight to
      storage with progress, private and signed; Cloudinary behind `server/storage`,
      enabled by env vars
- [x] Code snippets (language guessed, editable) and quick notes; a composer with
      `⌘/Ctrl+Enter`
- [x] Paste anywhere (links, files, text, code) and drag-and-drop onto the page
- [x] Collections (create, rename, delete with undo), tags with suggestions, kind chips,
      search; every filter in the URL
- [x] Masonry board with per-kind cards, hover actions, context menu, keyboard walking and
      delete with undo
- [x] Detail dialog: big preview or editor, notes, collection, tags, colors, download,
      prev / next
- [x] Vault items in the JSON export

Next:

- [ ] Screenshot fallback for pages without a share image
- [x] The Vault in the command palette (ADR 0020)
- [ ] Open items past the board's 1,000-item window
- [ ] Bulk select, move and delete; drag to reorder and into collections
- [ ] Purge a space's files on account deletion

## Phase 6 — Notes 🔨

Slice 1 ✅ — pages and the block editor (ADR 0011):

- [x] `page` table (nested via `parent_id`, Tiptap JSON document, plain-text excerpt,
      fractional `sort_key`)
- [x] Page tree beside the page: expand/collapse remembered per device, hover `+` and `⋯`,
      right-click menu, full keyboard tree (arrows, `Home`/`End`, `Delete`, menu key)
- [x] Block editor (Tiptap): text, three headings, bulleted / numbered / to-do lists,
      quote, callout, code, divider, and inline subpages
- [x] `/` slash menu with search; Markdown shortcuts (`#`, `-`, `1.`, `[]`, `>`, ` ``` `,
      `---`); a format bar on selection (bold, italic, underline, strike, code,
      highlight, link)
- [x] Block handle in the gutter: `+` adds a block, drag moves it, click (or `⌘/` /
      `Ctrl+/`) opens Turn into, Duplicate, Move up/down, Delete; `⌘⇧↑/↓` moves blocks
- [x] Emoji icon per page (curated, searchable picker); title, breadcrumbs, word count,
      "Edited …"
- [x] Autosave: debounced, strictly sequential, retried after a failure, flushed when
      leaving the page; a Saving / Saved indicator
- [x] Delete a page with its subpages, undoable (`⌘Z` or the toast)
- [x] Notes home: recently edited pages, empty state; the tree on mobile
- [x] Command palette: jump to pages by title; "New page" from anywhere

Next:

- [ ] `[[` page links and backlinks; link tasks into pages
- [ ] Daily journal page
- [ ] Drag to reorder and re-nest pages in the tree; favorites; trash
- [x] Full-text search in the palette (ADR 0020)
- [ ] Version history

## Phase 7 — Polish & launch 💭

- [x] Landing page that explains the product as you scroll: hero, six apps → one space,
      a room tour with live demos, principles, call to action. Always light (ADR 0017)
- [x] Global search across rooms (ADR 0020): one palette search over tasks (title and
      notes), pages (title and text) and the Vault, every word matching, with snippets
      and highlighted matches; results open in place
- [ ] Import (export of projects, stages, tasks, pages, time and the Vault is done)
- [ ] Onboarding, PWA, accessibility audit, performance budget
- [ ] Production hardening: rate limits, backups, monitoring, VPS deployment option

The order of phases 4–6 can change based on what we want to use first (Notes came first,
then Time, then the Vault).
