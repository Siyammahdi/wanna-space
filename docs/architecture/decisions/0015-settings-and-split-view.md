# 0015 — Settings grouped by purpose, and a split view for task details

- Status: Accepted
- Date: 2026-10-09

## Context

Settings (ADR 0010) began as four tabs. With Orbit, Time and the Vault there were more
choices worth offering (where to land, which rooms to show, a daily focus goal, board
defaults, sessions), and one long list would hide them.

Separately, the task detail panel slid over the page like a generic drawer, covering the
list you were working through.

## Decision

### Settings

- **Ten panes in four groups**: Preferences (General, Appearance, Notifications), Rooms
  (Tasks, Orbit, Time), Account (Profile, Security, Data) and Help (Shortcuts). Room panes
  carry the room's icon and hue. Every pane saves immediately and optimistically through
  `useSaveSettings`, rolling back with a toast on failure.
- **New account settings** (migration `0009`, all in `user_settings`): `start_room`,
  `hidden_rooms`, `capture_project_id` (quick capture's default project, set null if the
  project is deleted), `default_stages` (ADR 0014), `auto_start_focus` and
  `daily_focus_goal` (minutes, 0 = none, at most 12 h).
- **`/start`** is a route handler that redirects to the user's start room. Sign-in,
  sign-up, the logo and "already signed in" redirects all go there, so the choice applies
  everywhere without each caller reading settings.
- **Hidden rooms** only leave the sidebar and mobile nav; their URLs, the palette and
  shortcuts still work, and a hidden room still shows while you're in it. The start room
  can't be hidden (choosing it as start unhides it).
- **Auto-start** begins the next focus round when a break ends, but only if the break
  ended less than a minute ago; coming back hours later shouldn't find a timer that has
  been running all along.
- **New device preferences**: the completion tick sound (alongside the timer chime) and
  "show completed by default" in Tasks. They live in `localStorage` like the others,
  read through `lib/use-device-pref.ts` (`useSyncExternalStore`). That hook lives apart
  from `lib/settings.ts` because the root layout, a Server Component, imports the latter.
- **Security** lists signed-in sessions (with device and last activity) and can sign out
  one, all others, or this one; changing a password asks for the current one and signs
  out other sessions. Google-only accounts set a first password through the reset link.
- **Data** shows what the space holds (projects, tasks, pages, focus time, Vault items)
  next to the export.

### Split view

- On screens at least 64rem wide, opening a task makes the panel take the right half of
  the content area while the page glides into the left half and re-centres, instead of a
  drawer covering it. `claimSplitView()` (`lib/split-view.ts`) sets `html[data-split]`;
  CSS pads `main[data-split-shell]` by half the content width with a 520 ms ease. Claims
  are counted, so nested or quickly swapped panels don't flicker.
- The panel is then a labelled `region`, not a modal: the page stays interactive, `j`/`k`
  still walk the list, and `Esc` closes it. Below 64rem it remains a full sheet dialog
  with a focus trap.
- Pages that render beside the panel size themselves to their container, not the
  viewport (the Orbit board header uses container queries), so they lay out correctly in
  the half-width page.

## Consequences

- An account setting is still a column, a zod field in the action and a field on
  `AccountSettings`; a room-specific one goes in that room's pane.
- Layout code that branches on viewport width can be wrong in split view; prefer
  container queries for anything that can sit beside the panel.
