# 0018 — Today: a day plan, today's three, and one shared task list

- Status: Accepted
- Date: 2026-10-09

## Context

Today was a greeting, a "getting started" card, a read-only "Due today" list and two
placeholders. It is the room people open first, so it should answer "what matters today,
and what's next?" and let them act on it without going to Tasks. That needs a small
amount of per-day state (what you chose to focus on, a line about the day) that doesn't
belong on tasks themselves.

## Decision

- **A `day_plan` row per space and date** (migration `0011`) holds:
  - `intention`: one line, at most 140 characters.
  - `focus_task_ids`: up to three task ids, in order.

  It is per space rather than per user, like everything else (ADR 0005). It is keyed by
  the user's floating today (ADR 0006), so tomorrow starts empty and yesterday's plan is
  simply not read. There is no foreign key on the ids: `getDayPlan` drops ids whose task
  no longer exists, and `setFocusTasks` checks that each id is a top-level task in the
  caller's space.

- **Today's three** are picks, not a new status:
  - A pick is still an ordinary task; completing it from the slot is the same `useTasks`
    update as anywhere else (undoable, recurring tasks roll).
  - Picking or removing a pick is optimistic (`useOptimistic`) and saved with
    `setFocusTasks`, which calls `refresh()`. Removing is undoable.
  - The picker offers due/overdue tasks first, searches every open top-level task
    (`listTaskChoices({ topLevel: true })`), and can create a task due today. Enter picks
    the best match; it only creates when nothing matches.
  - A recurring pick that was completed today has already rolled to its next date. It
    still shows as done for the rest of the day.
  - "Focus" on a pick links it to the focus timer and starts a session (on a break it only
    links it).
- **One task list for the page.** `listTodayTasks(today, picks)` loads, in one query:
  - open top-level tasks due today or earlier;
  - tasks completed today (in the user's time zone);
  - the picks, whatever their date.

  `TodayBoard` keeps them in one `useTasks` state. The Overdue / Today / Done today
  sections, today's three, the progress ring and "Coming up" all read that state, so a
  change in one place shows everywhere on the same frame.

- **The rest of the page shows other rooms, read-only**, on one three-column grid that
  lines up with the three slots:
  - beside the tasks: the focus timer (live, with today's sessions on a 24-hour strip and
    the daily goal), then timed tasks with a "now" line and tomorrow's count;
  - a bottom row of three cards: active projects ordered by health, the last edited
    pages, and the last Vault saves.

  The bottom-row cards are Server Components passed into the client board as a slot.

- **The intention** saves on Enter or blur without `refresh()`: nothing else on the page
  depends on it.

## Consequences

- Picks don't follow a task's due date: a task picked for today stays picked even if it's
  moved to next week. That is intended: the plan is "what I said I'd do today".
- Vault items have no deep link yet, so "Jump back in" opens the Vault room.
- Time blocks (Planner) will add a "scheduled" view to Today later; "Coming up" uses due
  times until then.
