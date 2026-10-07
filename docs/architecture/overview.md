# Architecture overview

## Stack

| Concern      | Choice                                                   | Status  | Why → ADR                                          |
| ------------ | -------------------------------------------------------- | ------- | -------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack), React 19.2           | In use  | [0001](decisions/0001-tech-stack.md)               |
| Language     | TypeScript (strict), typed routes                        | In use  | 0001                                               |
| Styling      | Tailwind CSS v4 on CSS-variable design tokens            | In use  | [0003](decisions/0003-design-tokens-and-motion.md) |
| Motion       | `motion` (springs, layout) + CSS + View Transitions      | In use  | 0003                                               |
| Icons        | lucide-react                                             | In use  | —                                                  |
| Database     | Neon Postgres + Drizzle ORM                              | Phase 1 | 0001                                               |
| Auth         | Better Auth (sessions in our Postgres)                   | Phase 1 | 0001                                               |
| File storage | S3-compatible (Cloudflare R2 now, MinIO/S3 on VPS later) | Phase 5 | 0001                                               |
| Validation   | zod at every server boundary                             | Phase 1 | —                                                  |
| Hosting      | Vercel first; kept portable for a self-hosted VPS        | —       | 0001                                               |

Next.js 16 specifics to remember: `middleware.ts` is now `proxy.ts` (Node runtime only),
request APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async, and
`next lint` is gone (we run ESLint directly). Version-matched docs live in
`node_modules/next/dist/docs/` — read them before using an unfamiliar API.

## Folder layout

```
src/
├── app/                      Routing only — thin pages that compose features
│   ├── (marketing)/          Public pages ("/")
│   ├── (app)/                The signed-in space; layout = app shell
│   │   ├── today/            One folder per room; private `_components/` for page-only UI
│   │   ├── tasks/ planner/ notes/ time/ vault/
│   ├── design/               Living design-system reference
│   ├── layout.tsx            Fonts, theme bootstrap, <html>
│   └── globals.css           Tailwind + token → theme mapping, view transitions
├── components/               Shared, feature-agnostic UI
│   ├── ui/                   Primitives (Button, Badge, Card, Kbd …)
│   ├── shell/                App chrome (Sidebar, MobileNav, RoomHeader …)
│   ├── motion/               Motion wrappers (Reveal, RoomTransition)
│   ├── theme/                Theme switcher
│   └── brand/                Logo
├── features/                 One folder per domain; owns its UI, logic, and server code
│   └── tasks/
│       ├── components/       Feature UI (TaskCheck …)
│       ├── server/           (Phase 1+) queries.ts, actions.ts — server-only
│       ├── schema.ts         (Phase 1+) zod input schemas
│       └── types.ts
├── server/                   (Phase 1+) Cross-cutting server infrastructure
│   ├── db/                   Drizzle client + table definitions per domain
│   ├── auth/                 Better Auth config + session helpers
│   ├── storage/              S3-compatible client
│   └── dal.ts                Data access layer: auth + space scoping
├── config/                   Static app config (rooms registry, site metadata)
├── lib/                      Pure utilities (cn, motion presets, theme)
└── styles/tokens.css         Raw design tokens
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
  small public `index.ts` per feature.
- `server/**` files start with `import "server-only"` so they can't leak into client bundles.

## Data flow (from Phase 1)

- **Reads** happen in Server Components via `features/<x>/server/queries.ts`. Every query
  goes through the data access layer, which resolves the session and scopes by `space_id`.
  Authorization is never left to `proxy.ts` — the proxy only does optimistic redirects.
- **Writes** are Server Actions in `features/<x>/server/actions.ts`: validate with zod →
  authorize via the DAL → write with Drizzle → `updateTag()`/`refresh()` for read-your-writes.
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

## Portability (Vercel → VPS)

We avoid Vercel-only services. Storage is S3-compatible, auth and sessions live in our own
Postgres, and nothing depends on Edge-only runtimes. Moving to a VPS later means
`output: "standalone"`, a Docker image, and swapping env vars.
