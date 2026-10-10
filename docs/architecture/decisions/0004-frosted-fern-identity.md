# 0004 — Frosted Fern palette, grotesque type, tone over lines

- Status: Accepted
- Date: 2026-10-07
- Supersedes: the palette, typography, and elevation parts of [0003](0003-design-tokens-and-motion.md)
  (the token mechanism and motion layers still stand)

## Context

The first identity ("ember" accent, warm paper neutrals, Fraunces serif display, layered
`xs`→`xl` shadows, hairline borders on most surfaces) was reviewed and rejected: the accent
read as reddish, the serif felt off-brand, and small shadows plus borders everywhere made
the UI busy instead of calm.

## Decision

**Palette.** Derived from "Frosted Fern" (`#748469 #ABB290 #AAC1B1 #F9EAD7 #F6F6EE`) as
inspiration, re-expressed in OKLCH:

- Brand tokens `fern`, `sage`, `mint`, `cream`, `mist` for decorative use (glows, panels).
- Neutrals carry a faint green tint (hue ~107–140): mist canvas in light, forest charcoal
  in dark. Ink is a deep green-black.
- Accent is a deepened fern so it passes contrast as text and focus rings.
- Room hues avoid red entirely: honey, fern, olive, teal, dusty blue, lavender.

**Typography.** Two families, both sans:

- Bricolage Grotesque (`font-heading`) is the brand voice: headings, greetings, the
  wordmark. Variable `opsz` + `wdth` axes; optical sizing on.
- Figtree (`font-sans`) for all UI and body text — friendly, very legible at 13–15px.
- Geist Mono stays for data.

**Elevation and separation.**

- Tailwind's default shadow scale is reset (`--shadow-*: initial`). Only `shadow-md`,
  `shadow-lg`, `shadow-xl` exist, reserved for things that genuinely float (hover lift,
  popovers, dialogs). Resting surfaces have no shadow.
- Separation comes from **tone, not lines**: canvas → `surface-sunken` → `surface-raised`.
  Borders are allowed only where a line carries meaning (dividers inside dense lists,
  outlines of unchecked controls), never as default decoration on cards, buttons, or inputs.
- Inputs are filled (`bg-surface-sunken`) and show focus with an accent ring.

## Consequences

- Calmer screens with fewer visual edges; hierarchy depends on deliberate surface choice,
  so the surface ladder must be respected.
- `shadow-xs`/`shadow-sm` and `border` on cards will look "missing" to newcomers — the
  design doc states the rule explicitly.
- Palette retuning remains a one-file change in `src/styles/tokens.css`.
