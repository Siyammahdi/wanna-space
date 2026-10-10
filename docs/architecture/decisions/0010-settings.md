# 0010 — Settings: account settings in Postgres, device preferences in the browser

- Status: Accepted
- Date: 2026-10-08

## Context

Wanna Space needs a settings surface: a few choices change how data reads (when a week
starts, how times are written), others are about this screen (theme, motion, keyboard
hints). People use more than one device, and the first paint must already be right.

## Decision

- **Two kinds of preference.**
  - _Account settings_ follow the user everywhere: `weekStartsOn` (Saturday, Sunday,
    Monday) and `timeFormat` (12h / 24h). One row per user in `user_settings`; a missing
    row means the defaults (Saturday, 12h), so nothing is written until a choice changes.
  - _Device preferences_ belong to the browser: theme (`ws-theme`), reduce motion
    (`ws-motion`), keyboard hints (`ws-hints`) in `localStorage`, applied to `<html>`
    (`data-theme`, `data-motion`, `data-hints`) by an inline script before paint.
- **Reads** go through `server/settings.ts` (`getSettings`, `requireUser`, memoized per
  request). The app layout passes them to `SettingsProvider`; client components read
  `useSettings()`. Server pages that need them (the Planner) call `getSettings()`.
- **Writes** are one Server Action (`features/settings/server/actions.ts`): validated,
  upserted, then `refresh()`. The dialog applies the change optimistically and rolls back
  with a toast if it fails.
- **Reduce motion** mirrors `prefers-reduced-motion`: CSS under `[data-motion="reduced"]`
  plus `<MotionConfig reducedMotion="always">`. The OS setting always wins.
- **Account actions** use Better Auth directly: `updateUser({ name })`,
  `requestPasswordReset` (works for Google-only accounts too: it sets a first password),
  and `revokeOtherSessions`. Email changes and account deletion are left for later.
- **Export** is a route handler (`/api/export`) that streams the user's space as JSON
  through the DAL (`requireSpace`), so it's scoped like every other read.
- **The dialog** lives in `features/settings`, opens on `⌘,` / `Ctrl+,` or
  `requestSettings(section?)` (`lib/settings.ts`), and is a modal with a focus trap; keys
  pressed inside it never reach the page's shortcuts.

## Consequences

- Adding an account setting means a column, the zod schema in the action, and the
  `AccountSettings` type; adding a device preference means a key in `lib/settings.ts`
  and, if it affects first paint, a line in its init script.
- Device preferences don't sync. That's intended: a phone and a desktop often want
  different motion and hint settings.
