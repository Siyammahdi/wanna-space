# Design system

> Calm at rest, alive in motion.

Live reference: `/design`. Token source: `src/styles/tokens.css`. Tailwind mapping:
`src/app/globals.css`. Update all three together.

## Feel

- **Warm and personal**: paper-toned surfaces, warm charcoal in dark mode, a subtle paper
  grain on expressive surfaces (`paper-grain` utility), serif for human moments.
- **Serious**: near-black ink for primary actions, restrained color, generous whitespace,
  no gradients on controls.
- **Satisfying**: every frequent interaction has physical, springy feedback.

## Color

All colors are OKLCH so lightness is perceptually even across hues. Use semantic classes,
never raw palette colors or hex values.

| Group    | Tokens (as Tailwind color names)                                                    | Use                                                    |
| -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Surfaces | `canvas`, `surface-sunken`, `surface`, `surface-raised`, `surface-hover`, `overlay` | Page background → wells → panels → cards/popovers      |
| Ink      | `ink`, `ink-muted`, `ink-subtle`, `ink-faint`, `ink-inverse`                        | Primary text → secondary → hints → disabled/decorative |
| Lines    | `line`, `line-strong`                                                               | Borders, dividers; strong for hover/inputs             |
| Accent   | `accent`, `accent-hover`, `accent-soft`, `accent-ink`, `accent-contrast`            | "Ember". Focus rings, now-markers, selection, brand    |
| Feedback | `success`, `warning`, `danger` (+ `-soft`)                                          | Status only, never decoration                          |
| Rooms    | `room-{today,tasks,planner,notes,time,vault}` (+ `-soft`)                           | Orientation: icons, chips, progress inside a room      |

Rules:

- **Primary buttons are ink, not accent.** Accent is reserved so it stays meaningful; use
  the `accent` button variant for at most one celebratory action per view.
- Room hues share lightness and chroma, so they can sit side by side. Use `-soft` for
  backgrounds and the solid hue for icons and small marks, never for large fills or body text.

## Typography

| Role    | Family                    | Notes                                                                                             |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| Display | Fraunces (`font-display`) | Variable; `SOFT 100` for warmth. Greetings, page titles, empty states. Light (300) at large sizes |
| UI/body | Geist (`font-sans`)       | Everything functional. 13–15px in the app                                                         |
| Data    | Geist Mono (`font-mono`)  | Timers, counts, shortcuts; always `tabular-nums`                                                  |

## Shape and elevation

- Radius: `xs 6` · `sm 8` · `md 10` (controls) · `lg 14` · `xl 20` (cards) · `2xl 28`.
- Shadows are warm-tinted and layered: `shadow-xs` → `shadow-xl`. Cards rest at `sm`,
  lift to `lg` on hover; popovers use `lg`; dialogs `xl`.

## Motion

Three layers (see ADR 0003):

1. **CSS**: press (`active:scale-[0.97]`), hover, entrance (`<Reveal order={n}>`,
   `animate-rise`). Easing tokens: `ease-out`, `ease-in-out`, `ease-spring` (CSS `linear()`
   spring with overshoot).
2. **Springs** (`src/lib/motion.ts`):
   - `spring.snappy`: press, toggles, checks
   - `spring.gentle`: panels, sheets, layout shifts
   - `spring.bouncy`: moments of delight (complete, save)
   - `spring.glide`: shared-layout highlights (active nav, tabs, segmented controls)
3. **View transitions**: room content rises in, the shell stays still.

Rules: exits are faster than entrances. Never animate on first paint with JS. Respect
`prefers-reduced-motion` (handled globally). One expressive moment per interaction, not five.

### Signature interaction: completing a task

`features/tasks/components/task-check.tsx`. The fill springs in (`bouncy`), the check draws
itself, a ring bursts outward, the control pops, and the title strikes through left to
right. Use this as the bar for other "reward" moments (saving to the vault, finishing a
focus session).

## Components (v0.1)

| Component     | Path                                  | Variants                                                              |
| ------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Button        | `components/ui/button.tsx`            | primary, accent, secondary, ghost, danger · sm, md, lg, icon, icon-sm |
| Badge         | `components/ui/badge.tsx`             | neutral, accent, success, warning, danger                             |
| Card          | `components/ui/card.tsx`              | —                                                                     |
| Kbd           | `components/ui/kbd.tsx`               | —                                                                     |
| ThemeSwitcher | `components/theme/theme-switcher.tsx` | light / system / dark                                                 |
| RoomHeader    | `components/shell/room-header.tsx`    | —                                                                     |

Next primitives (Phase 1): Input, Textarea, Label/Field, Checkbox, Dialog, Popover,
Dropdown menu, Tooltip, Toast. Complex overlays will be built on accessible headless
primitives rather than from scratch.
