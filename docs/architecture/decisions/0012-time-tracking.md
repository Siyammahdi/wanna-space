# 0012 — Time: a server-held focus timer and time entries

- Status: Accepted
- Date: 2026-10-08

## Context

The Time room needs a focus timer (pomodoro or an open stopwatch) linked to a task that
survives reloads, plus logged time with daily and weekly reports. It must keep counting
with the tab closed, agree across tabs and devices, never log the same session twice, and
still feel instant.

## Decision

- **One timer per user, stored on the server** (`active_timer`, one row, no row = idle). A
  running timer is `run_started_at` plus `elapsed_ms` banked from earlier runs, so nothing
  ticks in the database: the time is derived from the clock. Pausing banks the elapsed
  time and clears `run_started_at`.
- **A pure state machine** (`features/time/timer.ts`) shared by the server and the client:
  `start`, `pause`, `finish`, `discard`, `setMode`, `advance`, and `apply(command)`. The
  server is authoritative: every change goes through `timerCommand`, which locks the row
  (`select … for update`), catches up with the clock, applies the command, inserts any
  finished sessions, and saves. The client applies the same function optimistically and
  adopts the server's answer.
- **Catching up** (`advance`) completes every phase that ended by now at its exact end
  time. A full focus round logs exactly its length, earns a round and starts the break; a
  break ends into a paused focus session (focus never starts by itself, so a timer left
  overnight settles after a couple of steps). Every `longBreakEvery` rounds the break is
  long. The stopwatch stops itself at 24 hours.
- **Logging rules:** finishing early logs the focus so far; under a minute isn't kept. An
  entry's `started_at` is when the session first started, and `seconds` is the focused time
  (pauses excluded), so `ended_at − started_at` can be longer. Entries keep their time when
  the task is deleted (`task_id` set null). Manual entries come from a local day + start
  time + duration, converted in the user's time zone (the `ws-tz` cookie, ADR 0006).
- **Client** (`TimerProvider` in the app layout): a shared clock that ticks only while
  running and corrects for clock skew measured around each request; when a phase runs out
  it sends `advance`, then a toast, a soft Web Audio chime (per-device switch) and, when
  allowed and the tab is hidden, a system notification. One tab chimes per phase end.
  Tabs sync over `BroadcastChannel`; a tab coming back to the foreground re-reads the
  timer (other devices). The tab title shows the countdown while running.
- **Settings:** focus, short and long break lengths and rounds per long break live in
  `user_settings` (synced to the account) and are passed to the state machine, so the
  server and client compute the same phase ends.
- **Reports** are computed from entries for the shown week (and today), grouped by the
  local day the session started on.

## Consequences

- The timer has no background job: catching up happens on the next request from any tab
  or device, which is also when sessions that finished meanwhile are logged ("Logged 25m
  while you were away").
- Without a service worker, notifications only fire while some tab is open.
- Editing entries (beyond delete, undo and manual add), tags, and per-project reports are
  later work; the tables already carry what they need.
