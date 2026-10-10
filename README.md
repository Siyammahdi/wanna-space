# Wanna Space

A personal space for your notes, tasks, time, plans, and everything that inspires you.
One space, seven rooms: **Today, Tasks, Orbit, Planner, Notes, Time, Vault**.

> Status: Phase 2 (Tasks) in progress — accounts and personal spaces work end to end, and
> the Tasks room is usable (quick add, sections, complete, edit, projects, capture from
> anywhere with `C`). See
> [docs/product/roadmap.md](docs/product/roadmap.md).

## Getting started

Requirements: Node 20.9+, pnpm 11, and access to the Neon project `wanna-space`.

```bash
pnpm install
cp .env.example .env.local   # then fill it in (see below)
pnpm db:migrate              # apply migrations to the database in DATABASE_URL_UNPOOLED
pnpm dev                     # http://localhost:3000
```

### Environment

| Variable                                       | Required | Notes                                                                                                               |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | yes      | Neon **pooled** URL (`-pooler` host). Use the `development` branch locally                                          |
| `DATABASE_URL_UNPOOLED`                        | yes      | Direct URL, used by drizzle-kit for migrations                                                                      |
| `BETTER_AUTH_SECRET`                           | yes      | 32+ random chars: `openssl rand -base64 32`                                                                         |
| `BETTER_AUTH_URL`                              | yes      | Public origin of the app. In development, any `localhost` port is trusted as well                                   |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | no       | Enables "Continue with Google". Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`                          |
| `RESEND_API_KEY`                               | prod     | In development, every email's link is also printed to the terminal (📬), sent or not                                |
| `EMAIL_FROM`                                   | no       | e.g. `Wanna Space <hello@yourdomain.com>` — the domain must be verified in Resend                                   |
| `CLOUDINARY_URL` (or the three `CLOUDINARY_*`) | no       | Enables Vault uploads and stored link images (ADR 0013). Without it the Vault still saves links, notes and snippets |

## Scripts

| Script             | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | Dev server (Turbopack)                                  |
| `pnpm build`       | Production build                                        |
| `pnpm typecheck`   | Generate route types + `tsc --noEmit`                   |
| `pnpm lint`        | ESLint                                                  |
| `pnpm format`      | Prettier (with Tailwind class sorting)                  |
| `pnpm check`       | typecheck + lint + format check — run before committing |
| `pnpm db:generate` | Generate a SQL migration from schema changes            |
| `pnpm db:migrate`  | Apply pending migrations                                |
| `pnpm db:studio`   | Browse the database with Drizzle Studio                 |

## Where things are

- `src/app` — routes (`(marketing)`, `(auth)`, `(app)` rooms, `/design` reference)
- `src/features` — domain code per area (auth, tasks, …)
- `src/server` — env, database, auth, email, storage, data access layer (server-only)
- `src/components` — shared UI primitives and app shell
- `src/styles/tokens.css` — design tokens
- `drizzle/` — SQL migrations
- `docs/` — product, architecture, ADRs, design system ([index](docs/README.md))
