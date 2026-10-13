# Architecture overview

## Stack

| Concern      | Choice                                                           | Status | Why → ADR                                                                                           |
| ------------ | ---------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack), React 19.2                   | In use | [0001](decisions/0001-tech-stack.md)                                                                |
| Language     | TypeScript (strict), typed routes                                | In use | 0001                                                                                                |
| Styling      | Tailwind CSS v4 on CSS-variable design tokens                    | In use | [0003](decisions/0003-design-tokens-and-motion.md), [0004](decisions/0004-frosted-fern-identity.md) |
| Motion       | `motion` (springs, layout) + CSS + View Transitions              | In use | 0003                                                                                                |
| Icons        | lucide-react                                                     | In use | —                                                                                                   |
| Database     | Neon Postgres 18 + Drizzle ORM over `pg` (pooled)                | In use | 0001, [0005](decisions/0005-auth-and-data-implementation.md)                                        |
| Auth         | Better Auth (email + password, Google; sessions in our Postgres) | In use | 0001, 0005                                                                                          |
| Email        | Resend + react-email                                             | In use | 0005                                                                                                |
| File storage | Cloudinary (optional) behind `server/storage`; R2/S3 later       | In use | 0001, [0013](decisions/0013-vault-and-storage.md)                                                   |
| Validation   | zod at every boundary (env, forms, server inputs)                | In use | —                                                                                                   |
| Hosting      | Vercel first (`sin1`, next to Neon); portable to a VPS           | —      | 0001                                                                                                |

Next.js 16 specifics to remember: `middleware.ts` is now `proxy.ts` (Node runtime only),
request APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async, and
`next lint` is gone (we run ESLint directly). Version-matched docs live in
`node_modules/next/dist/docs/` — read them before using an unfamiliar API.

## Folder layout

```
src/
├── app/                      Routing only — thin pages that compose features
│   ├── (marketing)/          Public pages ("/"); always light, scroll-explained landing (ADR 0017)
│   ├── (auth)/               sign-in, sign-up, forgot/reset-password, verify-email; split-screen layout
│   ├── (app)/                The signed-in space; layout = requireUser() + app shell
│   │   ├── _actions/search.ts  searchSpace: the palette's search over every room (ADR 0020)
│   │   ├── today/            One folder per room; private `_components/` for page-only UI.
│   │   │                     Each room: a data-free layout.tsx (RoomTransition) and a
│   │   │                     loading.tsx skeleton (ADR 0021)
│   │   ├── tasks/ orbit/ planner/ notes/ time/ vault/
│   │   │   (tasks/(lists)/ and notes/(tree)/ hold the layouts that load data: the
│   │   │   project nav and the page tree sit below the room's loading boundary)
│   ├── start/                Route handler: redirect to the user's start room (ADR 0015)
│   ├── api/auth/[...all]/    Better Auth route handler
│   ├── api/export/           JSON download of the user's space (ADR 0010)
│   ├── api/vault/[id]/download/  Ownership check → short-lived signed file URL (ADR 0013)
│   ├── design/               Living design-system reference
│   ├── layout.tsx            Fonts, theme bootstrap, <html>
│   └── globals.css           Tailwind + token → theme mapping, view transitions
├── components/               Shared, feature-agnostic UI
│   ├── ui/                   Primitives (Button, Badge, Card, Kbd, Popover, Switch,
│   │                         EmojiPicker, Skeleton …)
│   ├── shell/                App chrome (Sidebar, MobileNav, RoomHeader, RoomLoading, UndoShortcut,
│   │                         CommandPalette — feature results arrive as props,
│   │                         SettingsProvider / useSettings, CapabilitiesProvider /
│   │                         useCapabilities for server feature flags, ViewerProvider /
│   │                         useViewer: name and today, for loading states)
│   ├── motion/               Motion wrappers (Reveal, RoomTransition)
│   ├── theme/                Theme switcher, MotionPreference (reduce-motion setting), LightOnly
│   └── brand/                Logo
├── features/                 One folder per domain; owns its UI, logic, and server code
│   ├── auth/
│   │   ├── components/       Forms (sign-in, sign-up, reset …), Google button, check-inbox
│   │   ├── schema.ts         zod form schemas, safeNext()
│   │   └── errors.ts         Better Auth error codes → human copy
│   ├── notes/                (ADR 0011)
│   │   ├── components/       NotesProvider (optimistic tree, open branches), PageTree,
│   │   │                     PageView (title, icon, autosave), NewPageButton
│   │   │   └── editor/       NoteEditor (Tiptap), blocks, custom nodes, slash menu,
│   │   │                     bubble toolbar, block handle, DocPreview (server-safe render)
│   │   ├── server/           queries.ts (listPages, getPage, listRecentPages),
│   │   │                     actions.ts (create/update/delete/restore, newPage),
│   │   │                     search.ts (title and document text)
│   │   ├── tree.ts           Tree helpers (children, ancestors, subtree)
│   │   └── text.ts           Plain-text excerpt from a document
│   ├── orbit/                (ADR 0014)
│   │   ├── components/       OrbitOverview (project cards, filters, new project),
│   │   │                     OrbitBoard (stages + Done, drag and keyboard), BoardHeader,
│   │   │                     StageColumn parts (column, menu, add, pull from Inbox),
│   │   │                     OrbitCard, OrbitRing, StageBar
│   │   ├── hooks/use-stages.ts  Optimistic stages with undo
│   │   ├── server/           queries.ts (listOrbitProjects, getOrbitProject),
│   │   │                     actions.ts (create/update/delete/restore stages)
│   │   ├── board.ts          Columns, placement keys, progress, health (pure)
│   │   └── schema.ts         zod inputs, StageItem, OrbitProject, OrbitSummary
│   ├── planner/
│   │   ├── components/       WeekBoard, PlannerCard, LaneAdd, WeekNav
│   │   └── week.ts           Re-exports the week helpers from lib/week.ts
│   ├── settings/             (ADR 0010, 0015)
│   │   ├── components/       SettingsDialog and its grouped panes (General, Appearance,
│   │   │                     Notifications, Tasks, Orbit, Time, Profile, Security, Data,
│   │   │                     Shortcuts)
│   │   ├── hooks/            useSaveSettings (optimistic save, rollback with a toast)
│   │   └── server/           actions.ts (updateSettings), export.ts (buildExport),
│   │                         stats.ts (getSpaceStats)
│   ├── time/                 (ADR 0012)
│   │   ├── components/       TimerProvider (app-wide timer state), TimerPill (sidebar /
│   │   │                     mobile header), FocusTimer, TaskPicker, DaySummary,
│   │   │                     WeekReport, EntryList, LogTime, ProgressRing
│   │   ├── server/           queries.ts (getTimer, loadTimer, listEntries),
│   │   │                     actions.ts (timerCommand, syncTimer, logTime, delete/restore)
│   │   ├── timer.ts          The timer state machine (pure, shared by server and client)
│   │   ├── report.ts         Totals per day / task, day-strip positions (pure)
│   │   ├── clock.ts          Server-aligned client clock that ticks only while running
│   │   └── chime.ts          End-of-phase chime, its device switch, notifications
│   ├── vault/                (ADR 0013)
│   │   ├── components/       VaultProvider (optimistic items, collections, URL-synced
│   │   │                     filters), SaveBar + composer, VaultToolbar (collections,
│   │   │                     kind chips, tags, search), VaultBoard (masonry, keyboard),
│   │   │                     VaultCard, ItemMenu, ItemDetail, VaultOverlays (drop, detail)
│   │   ├── server/           queries.ts, actions.ts ("use server"), unfurl.ts (link
│   │   │                     metadata with SSRF guards), search.ts (palette results)
│   │   ├── filters.ts        Filtering, tag counts, masonry layout, labels (pure)
│   │   ├── language.ts       Snippet languages and the guesser (pure)
│   │   └── schema.ts         zod inputs, VaultItem, VaultCollection
│   ├── today/                The day plan: intention and today's three (ADR 0018); the room's
│   │                         UI lives in app/(app)/today/_components (TodayBoard, slots, cards)
│   │   ├── server/           queries.ts (getDayPlan), actions.ts (setIntention, setFocusTasks)
│   │   └── schema.ts         zod inputs, limits
│   └── tasks/
│       ├── index.ts          Public client-safe API for other rooms (cards, panel, hooks)
│       ├── components/       TaskBoard, TaskRow, QuickAdd, menus, TaskCheck,
│       │                     TaskDetail, ProjectNav, ProjectHeader, KeywordChip, QuickCaptureDialog,
│       │                     task-cover (CoverImage, image picker, paste/drop; ADR 0019)
│       ├── hooks/use-tasks.ts  Optimistic list + action wiring (client)
│       ├── server/           queries.ts (server-only reads), actions.ts + project-actions.ts
│       │                     ("use server"), search.ts (title and notes), cover.ts (signed
│       │                     cover URLs)
│       ├── order.ts          Board order and drag/keyboard placement rules (pure, ADR 0008)
│       ├── parse.ts          Natural-language quick-add parser (pure)
│       ├── keywords.ts       Project keywords: defaults from names, validation (pure, ADR 0016)
│       ├── projects.ts       Project color palette (keys → room tokens)
│       └── schema.ts         zod inputs, TaskItem, ProjectItem, TaskScope, ActionResult
├── server/                   Cross-cutting server infrastructure (all `server-only`)
│   ├── env.ts                zod-validated env + feature flags (google, email, uploads)
│   ├── db/                   pg Pool + Drizzle client; schema/ per domain
│   ├── auth/                 Better Auth config
│   ├── email/                Resend sender + react-email templates
│   ├── spaces.ts             ensurePersonalSpace()
│   ├── today.ts              getUserTimeZone(), getUserToday() from the ws-tz cookie (ADR 0006)
│   ├── settings.ts           getSettings(): the user's account settings (ADR 0010)
│   ├── storage/              The only module that knows the file provider (Cloudinary):
│   │                         signed uploads, verification, signed delivery URLs, deletes
│   ├── asset-trash.ts        Removed files kept a week for undo, then purged (ADR 0019)
│   └── dal.ts                getSession, requireUser, requireSpace, redirectIfSignedIn
├── lib/                      Pure utilities (cn, motion, theme, dates, id, auth-client, quick-capture,
│                             undo/redo history, keyboard helpers, settings types + device prefs,
│                             week math shared by Planner and Time, sound (tones), split-view,
│                             upload: direct upload to storage with progress, search: query
│                             words, LIKE patterns, snippets and highlights)
│                             and client hooks kept out of server-imported modules
│                             (use-device-pref)
├── config/                   Static app config (rooms registry, site metadata)
├── proxy.ts                  Optimistic redirect for signed-out room visits
└── styles/tokens.css         Raw design tokens
drizzle/                      Generated SQL migrations (committed)
docs/                         This documentation
```

## Dependency rules

Imports flow one way. A layer may import from layers below it, never above.

```
app/  →  features/  →  components/  →  lib/, config/, styles/
              ↓
          server/  (only from server code: server components, actions, route handlers)
```

- `components/` never imports from `features/` (keeps primitives reusable).
- Features don't import each other's internals; cross-room links go through `server/` or a
  small public `index.ts` per feature (the Planner and Orbit use `features/tasks/index.ts`;
  their pages in `app/` read through `features/tasks/server/queries.ts`).
- `server/**` files start with `import "server-only"` so they can't leak into client bundles.

## Data flow

- **Auth**: client forms call Better Auth through `lib/auth-client.ts`; the server side
  (`server/auth`) owns sessions, verification, and the sign-up hook that creates the
  personal space. Details and the three authorization layers: ADR 0005.
- **Reads** happen in Server Components via `features/<x>/server/queries.ts`. Every query
  goes through the data access layer, which resolves the session and scopes by `space_id`.
  Authorization is never left to `proxy.ts` — the proxy only does optimistic redirects.
- **Writes** are Server Actions in `features/<x>/server/actions.ts`: validate with zod →
  authorize via the DAL → write with Drizzle → `updateTag()`/`refresh()` for read-your-writes.
- **Navigation** is instant (ADR 0021): every room has a `loading.tsx`, which Next prefetches
  with the link, so a click lands on the room's skeleton while its data streams in.
  Anything above a loading boundary is prefetched and reused, so it holds no data. Queries
  in a page run in one `Promise.all` round wherever they don't depend on each other.
  Skeletons live beside the components they mirror (`features/*/components/*-skeleton.tsx`)
  and draw what the client already knows for real: the viewer (`useViewer`), settings,
  the shell's projects (`useShellProjects`, from the app layout), the notes tree.
- **Client state** is local and short-lived (`useOptimistic`, `useState`). No global client
  store until a real need appears.

## Conventions

- File names: `kebab-case.tsx`; components `PascalCase`; hooks `useThing`.
- Server Components by default. Add `"use client"` at the smallest leaf that needs it.
- First paint never depends on JavaScript: entrance animations are CSS (`<Reveal>`), JS
  motion is for interaction and post-hydration content.
- Styling uses semantic token classes (`bg-surface`, `text-ink-muted`, `text-room-tasks`).
  Raw Tailwind palette colors (`bg-gray-100`) and hex values in components are not allowed.
- New rooms are added in `src/config/rooms.ts` first.
- Run `pnpm check` (typecheck + lint + format) before committing.

## Environments and database workflow

- Copy `.env.example` → `.env.local`. Locally, `DATABASE_URL` points at the Neon
  `development` branch; production env vars point at the `production` branch.
- Change a table in `src/server/db/schema/` → `pnpm db:generate` (writes SQL to
  `drizzle/`) → review the SQL → `pnpm db:migrate`. Never edit an applied migration.
- Production migrations run deliberately, never automatically on deploy, until CI owns them.

## Portability (Vercel → VPS)

We avoid Vercel-only services. Storage sits behind one module (`server/storage`) that
stores provider-neutral asset records, so Cloudinary can be swapped for R2/S3/MinIO; auth
and sessions live in our own
Postgres, and nothing depends on Edge-only runtimes. Moving to a VPS later means
`output: "standalone"`, a Docker image, and swapping env vars.
