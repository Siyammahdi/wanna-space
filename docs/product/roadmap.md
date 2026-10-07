# Roadmap

Built in vertical slices: each phase ships something usable end to end and is reviewed
before the next begins. Status: ✅ done · 🔨 in progress · ⏳ next · 💭 later.

## Phase 0 — Foundation ✅

- [x] `src/` layout, route groups for marketing / app / internal
- [x] Design tokens (warm OKLCH palette, light + dark, room hues, elevation, motion)
- [x] Typography: Geist (UI), Fraunces (display), Geist Mono (data)
- [x] UI primitives: Button, Badge, Card, Kbd
- [x] App shell: sidebar with animated active state, mobile nav, theme switcher (no flash)
- [x] Room registry (`src/config/rooms.ts`) driving nav, landing, and design reference
- [x] Room-to-room view transitions (React `<ViewTransition>`)
- [x] Signature interaction: task completion check
- [x] Living design reference at `/design`
- [x] Docs: vision, roadmap, architecture, ADRs, design system
- [x] Tooling: typecheck, ESLint, Prettier (+ Tailwind class sorting), typed routes

## Phase 1 — Platform ⏳

Goal: a real user can sign up, sign in, and land in their own empty space.

- [ ] Neon Postgres project (dev + prod branches) and Drizzle ORM with migrations
- [ ] Environment validation (fail fast on missing config)
- [ ] Better Auth: email + password, Google OAuth, sessions
- [ ] Sign-in / sign-up / forgot-password screens in the design language
- [ ] `proxy.ts` optimistic redirects + a server-side data access layer that checks every request
- [ ] Personal space created on sign-up; all data scoped to it
- [ ] CI on GitHub Actions (typecheck, lint, build) and Vercel preview deploys
- [ ] Shared primitives needed by auth: Input, Label, Field, Toast

## Phase 2 — Tasks 💭

- [ ] Tasks + projects schema; fractional ordering
- [ ] Quick capture (`C` anywhere) with natural-language dates
- [ ] Inbox, Today, Upcoming, and project lists
- [ ] Edit panel: notes, due date/time, priority, tags, subtasks
- [ ] Drag to reorder; keyboard navigation and shortcuts
- [ ] Command palette (`⌘K`)
- [ ] Optimistic updates everywhere

## Phase 3 — Today + Planner 💭

- [ ] Today view wired to real data (due, scheduled, focus summary)
- [ ] Week planner: drag tasks onto days, time blocks
- [ ] Daily planning ritual ("pick today's three")

## Phase 4 — Time 💭

- [ ] Focus timer (pomodoro / free) linked to tasks; survives reloads
- [ ] Time entries and daily / weekly reports

## Phase 5 — Vault 💭

- [ ] Save links with fetched metadata, screenshot, and dominant colors
- [ ] Uploads (images, design files, snippets) to S3-compatible storage
- [ ] Collections, tags, masonry board, search

## Phase 6 — Notes 💭

- [ ] Block editor, nested pages, page tree
- [ ] Cross-room links and backlinks; daily journal page

## Phase 7 — Polish & launch 💭

- [ ] Global search across rooms; import / export
- [ ] Onboarding, PWA, accessibility audit, performance budget
- [ ] Production hardening: rate limits, backups, monitoring, VPS deployment option

The order of phases 4–6 can change based on what we want to use first.
