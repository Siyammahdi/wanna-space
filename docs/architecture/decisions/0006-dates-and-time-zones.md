# 0006 — Floating due dates; "today" resolved in the user's time zone

- Status: Accepted
- Date: 2026-10-07

## Context

Tasks have due dates, and almost every view asks "is this overdue, today, or later?". The
server renders those views, but it doesn't know the user's time zone, and a user in Dhaka
at 1 am must not see yesterday's tasks as "today" because the server runs in UTC.

## Decision

- **Due dates are floating calendar days**: Postgres `date`, carried as ISO strings
  (`YYYY-MM-DD`) end to end. "Pay rent on the 1st" means the 1st wherever you are; no
  instant in time is implied. Times of day (for the planner) will be a separate column.
- **The browser reports its zone**: an inline script in `<head>` writes the `ws-tz` cookie
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`). `server/today.ts` reads it,
  validates it with `Intl`, and computes today's date there; it falls back to UTC until
  the cookie exists (first-ever request).
- **Today is passed down as a prop** so server and client render the same sections — no
  hydration mismatch, no client-only date math on first paint.
- **Date arithmetic is UTC-only** on ISO strings (`lib/dates.ts`), so DST never skips or
  repeats a day.
- **Natural-language dates are parsed on the client** (`features/tasks/parse.ts`) against
  that same `today`, and the resolved ISO date is what the server validates and stores.

## Consequences

- Travelling users see "today" follow their device, which is what people expect from a
  personal planner.
- A stored user-level time zone (for emails, reminders, and recurring tasks) is still
  needed later; this cookie remains the fallback.
