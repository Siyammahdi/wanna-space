# 0003 — Design tokens in CSS variables; layered motion strategy

- Status: Accepted
- Date: 2026-10-07

## Context

The product should feel calm, warm, and serious at rest, with vivid, satisfying motion on
interaction. It needs light and dark themes and a distinct identity per room, without
components hard-coding colors.

## Decision

**Tokens.** Raw values live in `src/styles/tokens.css` as CSS variables (OKLCH), switched
by `[data-theme]` on `<html>`. `globals.css` maps them into Tailwind's theme (`@theme
inline`) so components use semantic classes (`bg-surface`, `text-ink-muted`,
`bg-room-tasks-soft`). Token names that would clash with Tailwind theme variables are
prefixed (`--elevation-*`, `--motion-ease-*`).

**Theme.** An inline script in `<head>` applies the stored preference (light / dark /
system) before first paint, so there is no flash.

**Motion, in three layers:**

1. **CSS** for hover/press feedback and entrance reveals — zero JS, works before hydration.
2. **`motion` springs** (`src/lib/motion.ts` presets) for interactive and layout
   animation: shared highlights, checks, panels.
3. **React `<ViewTransition>`** for room-to-room navigation, with the shell held still.

All three respect `prefers-reduced-motion`.

## Consequences

- One place to retune the whole palette or add a theme.
- Developers pick from named spring presets instead of inventing timings, keeping a single
  motion personality.
