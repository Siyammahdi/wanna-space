# 0017 — Landing page: light only, explained by scrolling

- Status: Accepted
- Date: 2026-10-09

## Context

The landing page (`/`) was a hero plus the room grid. It needs to explain what Wanna Space
is: why one space beats six apps, what each room does, and how it feels. It should do that
with motion as you scroll, without becoming a heavy, JavaScript-gated page. It also
represents the brand, so it shouldn't follow a visitor's dark theme.

## Decision

- **Light only.** The page always uses the light Frosted Fern palette:
  - `themeInitScript` forces `data-theme="light"` before first paint for paths in
    `LIGHT_ONLY_PATHS` (`src/lib/theme.ts`), so dark-theme users never see a flash.
  - `app/(marketing)/layout.tsx` wraps the page in `data-theme="light"`, and
    `<LightOnly />` keeps `<html>` light on client-side navigation and restores the
    saved theme on the way out, without touching the stored preference.
  - The page exports `viewport.themeColor` for the light canvas.
- **Two kinds of scroll motion:**
  - **CSS scroll-driven reveals** (`scroll-rise`, `nav-glass` in `globals.css`) use
    `animation-timeline` inside `@supports`. Without support, or with reduced motion, the
    content is simply visible. Nothing is hidden waiting for JavaScript.
  - **Scroll-linked set pieces** use motion's `useScroll` through
    `useScrollProgress` (`_components/use-landing.ts`): the hero window tilting flat, and
    the "six apps → one space" converge (a sticky section that scales a fixed design
    canvas to fit, with a narrow layout for phones).
- **Live demos, not screenshots.** The tour's room scenes (`_components/scenes.tsx`) are
  small React loops (`useSequence`) built from the real tokens and room hues. They run only
  while on screen. They server-render, and with reduced motion they stay on their finished
  frame. The "small things" section uses the real `TaskCheck`.
- **Reduced motion** (OS or in-app) is honoured everywhere: `useStill()` is false during
  hydration so markup matches, then holds scroll pieces at their end state. The converge
  section collapses to one screen (`motion-reduce:` / `in-data-[motion=reduced]:`), and
  CSS scroll animations are turned off.

## Consequences

- The marketing route group has its own layout; anything added under `(marketing)` is
  light only too. Add a path to `LIGHT_ONLY_PATHS` if a new public page needs the
  before-paint guarantee.
- Browsers without scroll-driven animations (Firefox today) get the page without the CSS
  reveals; the motion-powered pieces still work.
- Mockups are hand-built, so they need a refresh when a room's design changes noticeably.
