<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wanna Space — project rules

Read before changing code:

- `docs/architecture/overview.md` — folder layout, dependency rules, data flow, conventions
- `docs/design/design-system.md` — tokens, color rules, typography, motion presets
- `docs/product/roadmap.md` — current phase and scope; don't build ahead of it

Non-negotiables:

- Use semantic token classes (`bg-surface`, `text-ink-muted`, `text-room-tasks`); never raw
  Tailwind palette colors or hex values in components. New tokens go in
  `src/styles/tokens.css` + `src/app/globals.css` + the design doc.
- Motion: pick presets from `src/lib/motion.ts`; server-rendered entrances use `<Reveal>`
  (CSS). Never gate first paint on JavaScript.
- Server Components by default; `"use client"` at the smallest leaf.
- `components/` must not import from `features/`.
- Update the relevant doc (and roadmap checkboxes) in the same change. Record significant
  decisions as a new ADR in `docs/architecture/decisions/`.
- Run `pnpm check` before finishing.
