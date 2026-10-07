# Wanna Space

A personal space for your notes, tasks, time, plans, and everything that inspires you.
One space, six rooms: **Today, Tasks, Planner, Notes, Time, Vault**.

> Status: Phase 0 (foundation) complete. See [docs/product/roadmap.md](docs/product/roadmap.md).

## Getting started

Requirements: Node 20.9+ and pnpm 11.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script           | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Dev server (Turbopack)                                  |
| `pnpm build`     | Production build                                        |
| `pnpm typecheck` | Generate route types + `tsc --noEmit`                   |
| `pnpm lint`      | ESLint                                                  |
| `pnpm format`    | Prettier (with Tailwind class sorting)                  |
| `pnpm check`     | typecheck + lint + format check — run before committing |

## Where things are

- `src/app` — routes (`(marketing)`, `(app)` rooms, `/design` reference)
- `src/features` — domain code per room
- `src/components` — shared UI primitives and app shell
- `src/styles/tokens.css` — design tokens
- `docs/` — product, architecture, ADRs, design system ([index](docs/README.md))
