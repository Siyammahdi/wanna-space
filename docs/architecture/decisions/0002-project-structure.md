# 0002 — Project structure: routes thin, features own their domain

- Status: Accepted
- Date: 2026-10-07

## Context

Six rooms will grow in parallel. Without boundaries, shared folders like `components/` and
`lib/` turn into dumping grounds and features become entangled.

## Decision

- All code lives under `src/`. `src/app/` is for routing and composition only.
- Each domain is a **feature folder** in `src/features/<room>/` that owns its components,
  server queries/actions, schemas, and types.
- `src/components/` holds only feature-agnostic UI (primitives, shell, motion, brand).
- Cross-cutting server infrastructure (db, auth, storage, data access layer) lives in
  `src/server/` and is `server-only`.
- Route groups: `(marketing)` for public pages, `(app)` for the signed-in shell.
- Rooms are declared once in `src/config/rooms.ts`.

## Consequences

- Clear ownership: deleting or rewriting a room touches one feature folder plus its routes.
- Slight indirection for page-only UI, which can still live in a route's private
  `_components/` folder when it isn't reused.
