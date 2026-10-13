# Design system

> Calm at rest, alive in motion.

Live reference: `/design`. Token source: `src/styles/tokens.css`. Tailwind mapping:
`src/app/globals.css`. Update all three together. Rationale: ADR
[0003](../architecture/decisions/0003-design-tokens-and-motion.md) (mechanism, motion) and
[0004](../architecture/decisions/0004-frosted-fern-identity.md) (palette, type, elevation).

## Feel

- **Warm and personal**: Frosted Fern neutrals — mist canvas, forest charcoal in dark mode,
  soft mint/cream glows and a faint paper grain (`paper-grain`) on expressive surfaces.
- **Serious**: deep green-black ink for primary actions, restrained color, generous
  whitespace, no gradients on controls, nothing reddish.
- **Quiet**: separation by tone, not lines. Few edges, no resting shadows.
- **Satisfying**: every frequent interaction has physical, springy feedback.

## Color

All colors are OKLCH so lightness is perceptually even across hues. Use semantic classes,
never raw palette colors or hex values.

| Group    | Tokens (as Tailwind color names)                                         | Use                                                    |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Brand    | `fern`, `sage`, `mint`, `cream`, `mist`                                  | Decorative only: glows, auth/brand panels              |
| Surfaces | `canvas`, `surface-sunken`, `surface`, `surface-raised`, `surface-hover` | Page → wells/inputs/sidebar → panels → cards/popovers  |
| Ink      | `ink`, `ink-muted`, `ink-subtle`, `ink-faint`, `ink-inverse`             | Primary text → secondary → hints → disabled/decorative |
| Lines    | `line`, `line-strong`                                                    | Meaningful lines only (see rules)                      |
| Accent   | `accent`, `accent-hover`, `accent-soft`, `accent-ink`, `accent-contrast` | Fern. Focus rings, links, now-markers, selection       |
| Feedback | `success`, `warning`, `danger` (+ `-soft`)                               | Status only, never decoration                          |
| Rooms    | `room-{today,tasks,orbit,planner,notes,time,vault}` (+ `-soft`)          | Orientation: icons, chips, progress inside a room      |

Room hues: Today honey · Tasks fern · Orbit glacier · Notes olive · Planner teal · Time
dusty blue · Vault lavender. They share lightness and chroma, so they sit side by side; use `-soft` for
backgrounds and the solid hue for icons and small marks.

Rules:

- **Primary buttons are ink, not accent.** Use the `accent` button variant for at most one
  celebratory action per view.
- **Tone over lines.** Cards, buttons, inputs, badges, the sidebar, and nav have no borders.
  Build hierarchy with the surface ladder. A line is allowed only when it carries meaning:
  dividers in dense lists, the "or" divider, outlines of unchecked controls.
- No reddish hues anywhere except `danger`, and `danger` only for destructive or error states.

## Typography

| Role     | Family                               | Notes                                                                                  |
| -------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Headings | Bricolage Grotesque (`font-heading`) | Brand voice. Titles, greetings, wordmark. `semibold` in-app, `medium` at display sizes |
| UI/body  | Figtree (`font-sans`)                | Everything functional. 13–15px in the app, 15–17px for reading copy                    |
| Data     | Geist Mono (`font-mono`)             | Timers, counts, shortcuts; always `tabular-nums`                                       |

Headings use tight tracking (`-0.03em` to `-0.045em`, tighter as size grows) and balanced
wrapping (set globally on `h1–h3`).

## Shape and elevation

- Radius: `xs 6` · `sm 8` · `md 10` (controls, inputs) · `lg 14` (menus) · `xl 20` (cards) · `2xl 28`.
- Only `shadow-md`, `shadow-lg`, `shadow-xl` exist (`xs`/`sm` are removed on purpose).
  Resting surfaces have no shadow. `lg` for hover lift and popovers/menus, `xl` for dialogs.

## Motion

Three layers (ADR 0003):

1. **CSS**: press (`active:scale-[0.97]`), hover, entrance (`<Reveal order={n}>`,
   `animate-rise`), bars growing from their baseline (`animate-grow`, with
   `origin-bottom`), ambient (`animate-float`). Easing tokens: `ease-out`, `ease-in-out`,
   `ease-spring` (CSS `linear()` spring with overshoot).
2. **Springs** (`src/lib/motion.ts`):
   - `spring.snappy`: press, toggles, checks, menus
   - `spring.gentle`: panels, sheets, layout shifts
   - `spring.bouncy`: moments of delight (complete, save, "check your inbox")
   - `spring.glide`: shared-layout highlights (active nav, tabs, segmented controls)
3. **View transitions**: room content rises in (`--duration-base`, kept short because React
   holds streamed-in content until it ends), the shell stays still.

### Loading states

A click never waits on the network (ADR 0021). Each room's `loading.tsx` draws its
skeleton inside `<RoomLoading>` (announces "Loading…", marks `data-skeleton`). The bar is
pixel-for-pixel: when data lands, nothing moves; values just fill in.

- **Built from the real markup.** Each feature owns its skeleton next to the components it
  mirrors (`features/*/components/*-skeleton.tsx`) and copies their exact classes: same
  grid, card padding, row height, line box.
- **Everything known is real.** Room headers, section titles ("Today’s three", "Focus",
  "Recently edited"), buttons, placeholders, nav pills and links render as themselves.
  So does anything already on the client: the greeting and today (`useViewer`), the
  settings (the week, hour labels, goal bar), the running focus timer, the shell's
  projects with their counts (`useShellProjects`: the Tasks nav, a project's header,
  Orbit's cards and board title), and the notes tree (a page's breadcrumb, icon and
  title).
- **Only data is placeholder.** `SkeletonLine` centres a `Skeleton` bar in the text's real
  line height (`h-[1lh]`, `h-6` …); `SkeletonText` sits inside the real text element so
  the line box is unchanged. `OrbitRingSkeleton` is the ring's empty track. Bars use
  `bg-surface-hover/70` with `animate-pulse`, readable on every surface tone.
- **No second entrance.** The room enters once (its view transition); content swapped in
  for a skeleton doesn't `<Reveal>` again, or it would flash and slide.
- `html { scrollbar-gutter: stable }`: a short skeleton and a long page keep the same
  width. Wide rooms pass `wide` so the page keeps its width.
- The nav highlight moves on click (`useNavTarget`), before the URL changes.

Rules: exits are faster than entrances. Never animate on first paint with JS. Respect
`prefers-reduced-motion` and the in-app Reduce motion setting (both handled globally). One
expressive moment per interaction, not five.

### Landing page

`/` is always light (ADR 0017), whatever the visitor's theme. The story runs from top to bottom:

1. Hero: the headline, then a still of the Today room that lies back and settles flat as
   you scroll. Floating chips (quick add, Orbit ring, Vault save) drift at different
   depths.
2. Converge: a sticky section where six grey "another login" apps fly together into the
   rooms of one space, then Today appears beneath them.
3. Tour (`#tour`): copy scrolls on the left while a pinned frame on the right plays each
   room's live demo. The tab row above the frame is clickable and scrolls to that step. On
   phones the demos sit inline.
4. Small things: real task checks to tick, and keycaps that press themselves in turn.
5. Principles (`#calm`), the room grid (`#rooms`), a closing call to action with orbiting
   room-hue planets, and the footer.

Utilities: `scroll-rise` (a CSS scroll-driven entrance; stagger with `--rise-from` /
`--rise-to`), `nav-glass` (the nav frosts once you scroll), `key-press` (a keycap press
cycle; `--key-index` / `--key-count`). Brand colors (`fern`, `sage`, `mint`, `cream`,
`mist`) appear only as decoration: glows, the palette swatch, orbit lines. Mockups are
`aria-hidden` or `role="img"` with a label.

### Tasks room patterns

- **Priority** (never red): P1 `warning` (amber), P2 `room-time` (blue), P3 `ink-subtle`.
  The unchecked check ring takes the P1/P2 color.
- **Due dates**: overdue `warning`, today `accent-ink`, within a week `room-planner`, later
  `ink-subtle`. Labels read naturally: Today, Tomorrow, Friday, Oct 12.
- **Quick add** is a raised surface with an accent focus ring; parsed dates and priorities
  appear as chips that spring in (`bouncy`) as you type, and so does the project when a
  keyword or `#name` is recognised. The placeholder uses a real keyword as its example.
- **Project keyword chip** (`keyword-chip.tsx`): a `surface-sunken` pill with a faint `#`
  and the keyword in `font-mono` 12px, beside the project name (Tasks) or in the pill row
  (Orbit). Click to edit in place: the pill gains an `accent/40` ring, or `danger/40` with
  a one-line reason while the keyword is invalid; Enter or blur saves, Esc cancels.
- **Rows** follow one model everywhere (Tasks lists, Today): the whole row opens the detail
  panel — pointer cursor, `surface-hover/50` tint, and a faint chevron that nudges right on
  hover. The title is the row's accessible "open" button. Hover or keyboard focus reveals
  three quiet icon buttons: **Rename** (pencil), **Due date**, and **More** (⋯). The ⋯
  menu lists every action with its shortcut on the right — Open details ↵, Rename E,
  Complete X, a Priority row of flag toggles, Move to… (a sub-view, with Back), and
  Delete ⌫ in `danger`; groups are separated by space, not lines. Right-click and the
  menu key (or Shift+F10) open the same menu. Touch shows only ⋯ and the chevron; tapping
  the row opens the panel, which has everything. Rows enter with a short rise, leave with
  a slide-and-fade while siblings close the gap (`popLayout`).
- **Drag to reorder** (open tasks on Tasks pages): the whole row is the handle — it lifts
  after 6 px of travel (so a click still opens it) or a 250 ms long-press on touch (so a
  swipe still scrolls). A faint grip shows in the left gutter on hover as the hint. The
  lifted row turns `surface-raised` with `shadow-lg` and a 1% scale; siblings slide aside
  and the drop settles in place. Dropping into another section changes the date (Today,
  No date, or the date of the Upcoming task it lands next to) and toasts "Moved to Today"
  with Undo; reordering within a day is quiet. While dragging, empty sections the task
  may land in appear as `surface-sunken` drop zones that tint `accent-soft` on hover.
  Keyboard: `Alt`/`⌥` + `↑`/`↓` moves the cursor's task one step, crossing sections the
  same way. Rules: `features/tasks/order.ts`, ADR
  [0008](../architecture/decisions/0008-manual-task-order.md).
- **Repeat** shows in the meta line as a `Repeat` icon + "Weekdays", "Every Mon, Thu",
  "Monthly on the 1st" in `ink-subtle`, and as a chip in quick add. Completing a recurring
  task plays the full check moment, then the check clears and the row moves to its next
  date; the toast says where ("Done · next Thursday").
- **Project colors** reuse the room hues (fern, teal, blue, lavender, honey, olive →
  `room-*` / `room-*-soft`); new projects cycle through them. A project shows as a colored
  dot + name, never a colored block of text.
- **List nav** is a row of pills with a `layoutId` highlight that glides between them
  (`spring.glide`), like the sidebar.
- **Capture** is one gesture everywhere: `C`, the sidebar's Quick capture, or the mobile
  accent button. A page with its own add bar claims the request (the `ws:quick-capture`
  event, `lib/quick-capture.ts`); otherwise a dialog drops in from above (`gentle`) over a
  softly blurred `ink/25` scrim. Esc or a click outside closes it.

### Today

`app/(app)/today/_components/today-board.tsx` (ADR
[0018](../architecture/decisions/0018-today-room.md)). Three bands, under the room's own
entrance (no `<Reveal>`: they replace the loading skeleton in place):

1. **Header.** The greeting (`font-heading` 40/46px, `accent` full stop) with the
   intention line under it: a `Sparkle` in `accent` that turns a quarter on focus, and a
   bare input (no box) that reads as text. The progress ring sits on the right: an
   `OrbitRing` in `room-tasks` showing "done/total", with "n to go" beside it.
   The bands below the header share one three-column grid (`gap-4`), so every card lines
   up with the three slots. Card titles are 13px semibold with a quiet "Room →" link on the
   right.

2. **Today's three.** Three equal slots (`sm:grid-cols-3`; phones show the picks and the
   next empty slot only, as a single row).
   - A picked slot is `surface-raised` with a large faint ordinal, the check and title,
     the project label, and a **Focus** pill (`surface-sunken`, turning `room-time-soft`
     on hover, and `room-time-soft` with a pulsing dot while focusing).
   - Done slots fade to `room-tasks-soft/60`, and the ordinal takes `room-tasks`.
   - Empty slots mirror a picked slot's layout (faint ordinal on top, "+ Pick a task" at
     the bottom) on `surface-sunken`, the next one stronger; the `+` turns on hover.
   - The picker is a popover: search, "Due today" first, then "From your lists". The
     row Enter would choose is tinted with a `↵` keycap.
   - The band sits above the next one (`z-10`) so the popover opens over it.
3. **Work row** (`lg:grid-cols-3`; one column below `lg`).
   - **Two columns wide:** quick add (defaulting to today; its chips sit inside the bar,
     `surface-sunken`, so no row is reserved under it), then one tasks `Card` with
     Overdue (`warning`, ghost "Move all to today"), Today, and a collapsible "Done
     today", all using the Tasks row model. With nothing due, Today shows a `room-today`
     sun and copy that fits the moment (clear, catching up, or all done).
   - **One column:** **Focus** (the live clock and ring, or today's total with "Start
     focus" in `room-time-soft`; the goal bar; a 24-hour strip with a thin `ink/60` now
     marker), then **Coming up**, which stretches so both columns end level (times in
     `tabular-nums`, past items at 55% opacity, an `accent` "now" line).
4. **Rooms row** (`md:grid-cols-3`): three equal cards that always render, with a short
   empty state when there's nothing to show.
   - **Projects:** small orbit rings in each project's color, with the target or the
     health in its `HEALTH_META` color.
   - **Notes:** recent pages on `room-notes-soft` tiles.
   - **Vault:** recent saves on `room-vault-soft` tiles, or the save's thumbnail.

### Planner

`features/planner/components/week-board.tsx`. The page opts out of the app's reading width
(`data-wide` → up to `110rem`). One toolbar row carries the week label (`font-heading`
19px) with a quiet "N planned · N done" count, and on the right the Unscheduled toggle and
ghost This week / prev / next links (the room header above stays the only page title).

- **Day columns** are `surface` lanes (`rounded-xl`, 6px inset) with tasks as
  `surface-raised` cards. From 640px they sit side by side, at least `7.75rem` each
  (scrolling sideways, opened at today, when seven don't fit), and stretch to fill the
  viewport so every day is a full-height drop target. Phones read the week as an agenda:
  days stacked, empty past days hidden. The header is the short weekday in small caps plus
  the date, with a right-aligned count (`done/total`, open, or "N done" for past days);
  **today** tints its lane `accent-soft/50` and sets the date in an `accent` disc. Open
  days with tasks show a 2px `room-planner` progress line on `surface-sunken`. **Past
  days** fade to `surface/50` and only list what was done — anything still open from them
  waits in Overdue.
- **Unscheduled** (Overdue in `warning`, then No date) is a sticky 16rem rail beside the
  week from 1536px. Below that it's one horizontal strip above the week — fixed-width
  (15rem) cards with a 36px cover thumbnail instead of the banner — toggled by the
  "Unscheduled N" button. Overdue has **Move to today** (one undoable step).
- **Scrollbars** on sideways strips are thin and tinted (`scrollbar-width: thin`,
  `surface-hover` thumb), never hidden, so mouse users can scroll as easily as trackpads.
- **Cards** are compact rows: check, title (wraps, never truncated), then a meta line —
  time (or the date, in Overdue), priority, a repeat glyph, subtask progress, project.
  Done cards drop the surface and strike through. The whole card opens the detail panel;
  ⋯ appears on hover over the card's own background; right-click opens the same menu.
- **Dragging** lifts a copy (`shadow-lg`, 2% scale) and leaves a `surface-sunken` slot
  where it will land; lanes make room as it passes. Moving to another day toasts "Moved to
  Tuesday" with Undo. Each open day (and No date) ends with a quiet **Add task** that
  becomes an inline field using the quick-add grammar.

### Keyboard

Single-key shortcuts never fire while typing in a field (`isTypingTarget`, `lib/keyboard.ts`).
On task lists the keyboard cursor is a 3px `accent` bar at the row's left edge that glides
between rows (`layoutId`, `spring.snappy`) over a `surface-hover/70` tint; the row scrolls
into view as it moves. Keys: `j`/`k` or arrows, `x`, `e`, `Enter`, `Alt`+`↑`/`↓` (reorder),
`1`–`3`/`0`, `Delete`, the menu key, `Esc` (`features/tasks/hooks/use-task-navigation.ts`).
Modifier labels follow the platform (`⌥` on Apple, `Alt` elsewhere). A quiet hint line of
`Kbd`s sits under the list on pointer devices only. Popovers move focus to their first
item when they open, walk items with arrows / Home / End, and return focus to the trigger
when they close (unless something else, like an inline editor, took it). The detail panel
returns focus to where it was opened from.

### Command palette

`components/shell/command-palette.tsx`, mounted once in the app layout. `⌘K` / `Ctrl+K`
toggles it anywhere (also from text fields); the sidebar's Search and the mobile header's
search button open it via `requestCommandPalette()` (`lib/command-palette.ts`). It drops in
like the capture dialog (`ink/25` blurred scrim, `canvas` sheet, raised input bar) with
`spring.snappy`. Results are grouped — Jump to, Tasks, Pages, Vault, Actions — under small
uppercase labels; the active row is a `surface-hover` pill that glides with the arrow keys
or the pointer. Static items match by prefix, word start, substring, then loose
subsequence (labels only; keywords need a real substring). Searching the space is one
server action passed in from the layout (so `components/` stays feature-free), debounced,
from two characters; a spinner replaces the `Esc` hint while it runs, and the previous
results stay up meanwhile so the list doesn't blink. Each result carries its room's glyph
(open/done circle for tasks, the page's emoji or a page glyph in `room-notes`, a kind glyph
in `room-vault`) and a quiet hint (project, parent page, kind · site · collection). When the
match is in the body rather than the title, a second line shows a snippet around it.
Matched words are marked `accent-soft` with `accent-ink` text. "New page" is a server
action that creates the page and redirects.

### Notes

The layout widens (`data-wide`) to a 44rem page with the tree column (13.5–15rem) at the
far right, so the page starts where every other room's content starts.

- **Page tree**: rows like the sidebar (`surface-raised` for the current page,
  `surface-hover/70` on hover), 14px indent per level, a chevron that rotates with
  `ease-spring`, rows that grow in and out (`spring.gentle`). Hover (or focus) reveals `⋯`
  and `+`; right-click opens the same menu. A proper ARIA tree for the keyboard.
- **Page header**: breadcrumbs (13px `ink-subtle`), the save state (spinner + "Saving",
  an `accent-ink` check + "Saved", or a `danger` "Not saved · Retry") and `⋯` on the right.
  A 52px emoji (or a hover-revealed "Add icon"), the title in `font-heading` 40–44px
  semibold, then "Edited … · N words" in 12.5px `ink-subtle`.
- **Editor typography** (`.ws-prose` in `globals.css`): 16.5px / 1.7 Figtree; headings in
  Bricolage at 1.85 / 1.45 / 1.18rem; blocks are separated by spacing only. Inline code
  and code blocks on `surface-sunken`; highlights use `room-today-soft`; links
  `accent-ink` with a soft underline; quotes have a 3px `line-strong` rule (the one
  meaningful rule); callouts are `surface-sunken` panels with the emoji at the left;
  dividers are a 1px `line`. To-do boxes match the task check's language: `surface-sunken`
  with an inset `line-strong` ring, filling `accent` with a springy check mark.
- **Editor chrome**: the slash menu and format bar are `surface-raised` + `shadow-lg`
  popovers; the block handle (`+` and a grip) sits in a 56px gutter on large screens and
  follows the hovered block. The drop cursor is a 3px `accent` line. Placeholders appear in
  `ink-faint` only on the focused empty block (or an empty page).
- **Before hydration** the same document renders statically (`DocPreview`) with the same
  styles, so nothing jumps when the editor mounts.

### Time

Two columns on desktop: the timer and the session list on the left, Today and the week
on the right (one column on phones: timer, today, week, sessions).

- **Focus timer**: a `surface-raised` card. A segmented Pomodoro / Stopwatch switch (the
  active segment glides, `spring.glide`; locked mid-session). A 248px ring, 7px stroke on a
  `surface-sunken` track: `room-time` for focus, `accent` for breaks, easing linearly
  between ticks. A soft blurred `room-time-soft` (or `accent-soft`) glow appears behind it
  only while running. Digits in `font-heading` 56px semibold `tabular-nums`; the status
  ("Ready to focus", "Focus", "Paused", "Short break") in 13px `ink-subtle`; round dots fill
  `room-time`. Below: the task picker and a borderless note field. Controls: the accent
  `lg` Start / Pause / Resume (with a `Space` hint) flanked by ghost Discard and Finish
  (Skip on a break).
- **Timer pill**: outside the Time room, a running or paused session shows above the theme
  switcher: a small ring, the time, the task or phase, and a pause/resume button. In the
  mobile header it's compact (ring and time, a link to Time). It springs in and out.
- **Reports**: Today's total in `font-heading` 30px with a 24-hour strip (sessions as
  project-colored bars on `surface-sunken`) and the top tasks. The week: three stat tiles
  on `surface-sunken/60`, seven bars that grow from the baseline (`animate-grow`,
  staggered; today in `room-time`, other days `room-time/55`), and per-task bars.
- **Sessions**: grouped by day with day totals; time range, project dot, task (or note),
  source icon (pomodoro, stopwatch, by hand) and duration; delete on hover/focus (always
  visible on touch), undoable.
- **Feedback**: a toast when a phase ends ("Focus done · Time for a short break."), a soft
  two-tone chime (switch on the card, per device) and an optional system notification
  when the tab is hidden. The tab title shows the countdown while running.

### Vault

The layout widens (`data-wide`). From the top: the save bar, the collection pills, the
kind chips with tags and search, then the masonry board.

- **Save bar**: one `surface-raised` `rounded-xl` field ("Paste a link, or jot something
  down") with a `room-vault-soft` link badge, an inline `ink` Save button once there's
  text, and ghost Note / Snippet / Upload buttons (Upload only when storage is
  configured). Enter saves a link, or a quick note when it isn't one. Pasting routes by
  content: files upload, multi-line text opens the composer (as a snippet when it looks
  like code). The composer grows open under the bar (`spring.gentle`): a `font-heading`
  title, a borderless textarea (mono with Tab inserting spaces for snippets, plus a
  language picker), "Saving to …" when a collection or tag is active, `⌘/Ctrl+Enter` saves,
  Esc discards with Undo.
- **Collections**: pills (All, Unsorted, each collection) with counts; the active one is a
  `surface-raised` pill that glides (`layoutId`, `spring.glide`) and carries a `⋯` menu
  (Rename inline, Delete with Undo); right-click opens it on any pill.
- **Filters**: kind chips (Links, Images, Files, Snippets, Notes; only kinds present in
  the collection appear);
  the active chip is `room-vault-soft` / `room-vault`. Tags open a popover with counts;
  an active tag shows as a removable pill. Search is a `surface-sunken` field (`/` focuses
  it, Esc clears). Every filter is in the URL.
- **Cards**: `surface` `rounded-xl`, no borders, separated by the masonry gap. Links show
  the share image (1.91:1), favicon, site, title and two lines of description; images
  fill the card and reveal the title and color swatches on hover; files show a preview or
  a `surface-sunken` block with the extension; snippets show the language badge and mono
  code faded out at the bottom; notes show the text. Hover (or focus) reveals quick
  actions on `canvas/85` blurred chips (open site, copy, download) and `⋯`; right-click
  or `Shift+F10` opens the same menu. Tags are small `ink-subtle` `#tag` labels.
- **Pending cards**: a saving link is a pulsing `surface-sunken` preview with its URL and
  "Fetching preview…"; an upload shows a faded local preview, the file name and a
  `room-vault` progress bar. Both turn into the real card in place.
- **Drop overlay**: dragging files or a link over the page blurs it (`canvas/70`) and
  shows a `surface-raised` target outlined in `room-vault` ("Drop to save to your
  Vault").
- **Detail**: a `canvas` dialog (`rounded-2xl`, up to 70rem, full screen on phones) over
  the blurred `ink/25` scrim. The preview (or the note/snippet editor) on the left, a
  `surface/60` side column on the right: kind and position with prev / next / close
  (`←`/`→`, Esc), title, URL with copy, notes, collection, tags (`room-vault-soft` chips),
  colors (click to copy the hex), details and actions. Edits save on blur.
- **Keyboard**: arrows (or `j`/`k`) walk the board in column order, `Home`/`End`, Enter
  opens, `Delete`/`Backspace` deletes (Undo) and focus moves to the neighbour.
- **Empty states**: a `room-vault-soft` badge with one line of copy, and different copy
  when only the filters hide everything (with Clear filters).

### Orbit

Projects as boards (ADR 0014). The layout widens (`data-wide`).

- **Orbit ring** (`orbit-ring.tsx`): the project's progress as an SVG ring in the
  project's color, with a small planet riding the end of the arc. Both animate in CSS
  (`animate-orbit-draw`, `animate-orbit-sweep`, 1.1 s ease-out), so the first paint is
  already moving and reduced motion simply shows the end state. The centre holds the
  project's emoji or the percentage.
- **Stage bar** (`stage-bar.tsx`): one segment per stage, width by task count, the
  project color at rising opacity left to right and full strength for Done. It reads as
  "how far along the pipeline is the work", not just "how much is done".
- **Overview**: status filter pills (All, In orbit, Planning, Paused, Landed; the active
  pill glides with `layoutId`), then a grid of `surface` `rounded-xl` project cards that
  lift slightly on hover: ring, name, status pill, health, a two-line brief, the stage
  bar, open / done / overdue counts and the target ("Lands in 12 days"). "New project" is
  a `room-orbit-soft/60` tile that opens an inline form.
- **Status and health**: Planning `surface-sunken` / `ink-muted`, In orbit `accent-soft` /
  `accent-ink`, Paused `warning-soft` / `warning`, Landed `success-soft` / `success`.
  Health is text only: On track `success`, At risk and Past target `warning` (never red).
- **Board header**: back to Orbit, the emoji (picker), the name (edit in place), status
  and target-date pills, health, and the brief as an auto-growing borderless textarea; on
  the right, the 72 px ring with "n of m done", Open as list and a `⋯` menu (color,
  delete). It uses container queries so it stacks when the page is split.
- **Columns**: `surface` `rounded-xl` wells, 15.5 rem minimum, in a horizontally
  scrolling row (snap on phones, 17.5 rem each). The header shows the name (click to
  rename), the count (`/limit` when set, turning `warning` with a `warning-soft/50` well
  past it) and a `⋯` menu (Rename, WIP limit, Move left/right, Delete with Undo). The
  footer adds a task (quick-add grammar) or pulls one in from the Inbox. Done is a
  `success-soft/40` well, newest first, 12 shown with "Show more". "Add stage" is a ghost
  tile after the last stage.
- **Cards**: `surface-raised` `rounded-lg` (Done cards drop the surface); the task check,
  title, and a meta line (due, priority, repeat, a thin subtask progress bar). The same
  menu as Tasks (`⋯`, right-click, `Shift+F10`). Dragging lifts the card (`shadow-lg`,
  scale 1.02, a 0.6° tilt) and leaves a `surface-sunken` slot; the target column tints
  `surface-hover`. A move across stages toasts "Moved to …" with Undo.
- **Keyboard**: arrows walk cards (left/right between columns), `Alt` + arrows move the
  card, Enter opens, `x`, `Delete`, `0`–`3`, menu key.

### Settings

`features/settings/components/settings-dialog.tsx`, mounted once in the app layout. Opens
with `⌘,` / `Ctrl+,`, the sidebar's Settings, the account menu, or the palette
(`requestSettings(section?)`, `lib/settings.ts`). A `canvas` dialog (`rounded-2xl`,
`shadow-xl`, up to 58rem × 44rem) over the blurred `ink/25` scrim, rising in with
`spring.gentle`; on phones it fills the screen and the sections become a scrolling row.

- **Layout**: a `surface-sunken/70` side column with "Settings" and the sections in four
  small-label groups (ADR 0015): Preferences (General, Appearance, Notifications), Rooms
  (Tasks, Orbit, Time — with each room's icon in its hue), Account (Profile, Security,
  Data) and Help (Shortcuts). Group labels show from `md` up. The active section is a
  `surface-raised` pill that glides (`layoutId`, `spring.glide`) with an `accent-ink` icon. The pane: title
  (`font-heading` 19px) and one line of description, then groups with a small
  `ink-subtle` label and, on the right, where the setting lives ("Synced to your account"
  / "This device").
- **Choice cards** (`RadioCards`): `surface` cards in a grid, a radio dot in the corner,
  the chosen card ringed in `accent` (2px). Each card shows the result, not just a name:
  a mini week strip, the time written both ways, a miniature of the app drawn with the
  real tokens of each theme (nested `data-theme`; System is split on the diagonal).
- **Rows**: `surface`, `rounded-xl`, title + one-line description on the left, the control
  (Switch, secondary `sm` button, badge, or value) on the right. `SwitchRow` makes the
  whole row's label toggle the switch; `ChoiceRow` offers a few values as chips.
- **Lists inside panes** (sessions, the default stages editor, sidebar rooms) are rows of
  the same shape; editable lists save as a whole with Cancel / Save once changed.
- **Behaviour**: account settings apply at once and roll back with a toast if saving fails;
  device preferences apply instantly. Focus starts on the active section, stays inside
  the dialog (Tab wraps), and returns to the opener on close. Arrow keys move between
  sections and between cards; Esc closes. Keys pressed inside never reach the page.
- **Keyboard hints** (`data-kbd-hints`): elements marked with it hide when the user turns
  hints off (`[data-hints="off"]` on `<html>`). Use it for shortcut badges and hint lines.
- **Reduce motion** (`[data-motion="reduced"]`) mirrors `prefers-reduced-motion` in CSS and
  sets `MotionConfig reducedMotion="always"`; the OS setting always applies on its own.

### Signature interaction: completing a task

`features/tasks/components/task-check.tsx`. The fill springs in (`bouncy`), the check draws
itself, a ring bursts outward, the control pops, and the title strikes through left to
right. The row holds for 650 ms so the moment lands, then moves to Completed. Use this as
the bar for other "reward" moments.

## Components (v0.2)

| Component      | Path                                   | Notes                                                                 |
| -------------- | -------------------------------------- | --------------------------------------------------------------------- |
| Button         | `components/ui/button.tsx`             | primary, accent, secondary, ghost, danger · sm, md, lg, icon, icon-sm |
| Input          | `components/ui/input.tsx`              | `Input`, `PasswordInput` (show/hide); filled, accent focus ring       |
| Field          | `components/ui/field.tsx`              | Label + control + error/hint, with an optional aside (e.g. a link)    |
| Alert          | `components/ui/alert.tsx`              | info, success, danger                                                 |
| Spinner        | `components/ui/spinner.tsx`            | Inline, inherits text color                                           |
| Badge          | `components/ui/badge.tsx`              | neutral, accent, success, warning, danger                             |
| Card           | `components/ui/card.tsx`               | `surface-raised`, no border or shadow                                 |
| Kbd            | `components/ui/kbd.tsx`                | —                                                                     |
| Switch         | `components/ui/switch.tsx`             | `role="switch"`; `ink-faint` track → `accent`, thumb springs across   |
| ThemeSwitcher  | `components/theme/theme-switcher.tsx`  | light / system / dark                                                 |
| Popover        | `components/ui/popover.tsx`            | Anchored panel, arrow-key items, focus return; `MenuItem`, `MenuGap`  |
| Toast          | `components/ui/toast.tsx`              | `toast()` / `dismissToast()` + `<Toaster />`; optional action button  |
| UserMenu       | `components/shell/user-menu.tsx`       | Avatar, name/email, Settings, sign out; `compact` for mobile          |
| RoomHeader     | `components/shell/room-header.tsx`     | —                                                                     |
| CommandPalette | `components/shell/command-palette.tsx` | `⌘K`; places + actions built in, space search passed in               |

Forms: validate on submit with zod, show the first error per field via `Field`, disable the
submit button with a `Spinner` while pending, and put server errors in an `Alert` at the
top of the form. Error copy is human and says what to do next (`features/auth/errors.ts`).

Next primitives: Textarea, Checkbox, Dialog (the capture dialog is bespoke for now),
Dropdown menu, Tooltip.

### Toasts and undo

`toast({ message, detail?, action?, duration?, id? })` from `components/ui/toast.tsx`;
`<Toaster />` is mounted once in the app layout. Toasts are an inverse surface (`bg-ink`,
`text-ink-inverse`), bottom-center (above the mobile nav and capture button), at most three,
spring in with `snappy`, and pause while hovered or focused.

Undo/redo: features record each change with its inverse via `recordUndo()`
(`components/shell/undo.tsx`, history in `lib/undo.ts`). `⌘Z` / `Ctrl+Z` undoes,
`⇧⌘Z` / `Ctrl+Shift+Z` / `Ctrl+Y` redoes; text fields keep their native undo. A new change
clears the redo history. Changes that make something leave the view — complete, move,
delete, capture — get a toast with an **Undo** button (6 s, with the shortcut hint on
pointer devices). Quiet edits (rename, notes, date, priority, subtasks) are undoable by
shortcut only. Undoing shows "Undone" with a **Redo** button, and vice versa.

### Task detail panel

`features/tasks/components/task-detail.tsx`. Clicking a task opens it beside the page,
not over it (ADR 0015). From 64rem up the panel takes the right half of the content area,
a `surface` card inset 12 px (`rounded-2xl`), while the page glides into the left half and
re-centres (520 ms, `cubic-bezier(0.32, 0.72, 0, 1)`, shared by both); there's no scrim
and the page stays usable. Below that it's a 440 px `canvas` sheet over a light `ink/10`
scrim (full screen on phones) that glides in with `spring.glide`. Esc, × or the scrim
closes it. Fields are borderless and edit in place —
hover tints `surface-hover`, focus sinks to `surface-sunken`. Properties sit in a
label/value grid; notes and subtasks are sections with small uppercase headings. Subtask
progress is a thin `room-tasks` bar. Everything saves on blur (and on close).
Complex overlays will be built on accessible headless primitives rather than from scratch.

### Task covers

`features/tasks/components/task-cover.tsx` (ADR 0019). A cover is a photo, so it's
cropped to fill its frame (`object-cover`) on a `surface-sunken` placeholder, with no
border or shadow. Each surface frames it differently:

- **Task panel:** a 2:1 banner (`rounded-xl`, at most 256 px tall) above the title.
  Change and Remove are small `surface/85` blurred pills in its bottom-right corner; they
  appear on hover or focus, and always on touch. Without a cover, an "Image" property
  offers "Add an image", with a faint "or paste or drop one" on desktop.
- **Dragging a file over the panel** shows an `accent-soft` veil with an icon and "Drop to
  add (or replace) the image".
- **Orbit cards:** a 16:9 cover above the title. **Planner cards:** a 2:1 cover (the
  columns are narrow). Both are inset in the card's padding with `rounded-md`.
- **List rows:** a 40 px square thumbnail (32 px compact) on the right, before the row
  actions. **Today's three:** a 44 px `rounded-lg` square beside the title.
- **Done tasks** fade theirs to 60%.
- **While uploading,** the local preview shows at 60% with a spinner in a small blurred
  disc. The stored image replaces it on the same round trip.
