# 0001 — Tech stack

- Status: Accepted
- Date: 2026-10-07

## Context

We're building a multi-user SaaS (personal spaces) on a fresh Next.js 16 starter. It deploys
to Vercel first but may move to our own VPS, so we want control over data and no hard
lock-in to one host.

## Decision

- **Next.js 16 App Router + React 19.2 + TypeScript strict.** Server Components and Server
  Actions cover most of the backend; no separate API service for the MVP.
- **Neon Postgres + Drizzle ORM.** Relational data fits the domain (tasks, projects, links).
  Neon gives branching for previews; it's plain Postgres, so a VPS move is a connection-string
  change. Drizzle is typed SQL with readable migrations.
- **Better Auth.** Open-source, sessions stored in our own database, email/password + OAuth,
  no per-user vendor pricing.
- **S3-compatible object storage** (Cloudflare R2 to start) for vault uploads, accessed via
  the S3 API so MinIO or AWS S3 can replace it.
- **Tailwind CSS v4** on our own design tokens; **motion** for spring physics.

## Alternatives considered

- Supabase (DB + Auth + Storage in one): faster start, but more platform coupling.
- MongoDB: weaker fit for relational, cross-linked data.
- Local-first sync: compelling, but adds sync complexity before the core product exists.

## Consequences

- More pieces to wire in Phase 1 (DB, auth, storage are separate), in exchange for
  portability and control.
- All authorization lives in our code (data access layer), so it must be tested carefully.
