# 0007 — Recurring tasks roll forward in place

- Status: Accepted
- Date: 2026-10-08

## Context

People repeat chores, reviews, and bills. A recurring task needs a rule ("every Mon and
Thu", "monthly on the 1st"), and completing it has to produce the next occurrence without
cluttering the lists, breaking undo, or losing the task's notes and subtasks.

The two common models are (a) **roll forward**: one row whose due date moves when it's
completed, and (b) **spawn**: completing closes the row and inserts a fresh copy.

## Decision

- **Roll forward.** A task has a nullable `repeat jsonb` rule (migration `0004`).
  Completing it moves `due_date` to the next occurrence and keeps it open; notes, priority,
  project, and time stay. Its subtasks are a checklist: completed ones reopen.
- **The rule** is `{ freq: day|week|month|year, every, days?, day? }`
  (`features/tasks/repeat.ts`): `days` pins weekly rules to weekdays (0 = Sunday), `day`
  pins monthly and yearly rules to a day of the month, clamped to short months (Jan 31 →
  Feb 28 → Mar 31) so the series never drifts. It's validated and normalized with zod on
  the way in and re-parsed on the way out, so stored JSON can't widen the type.
- **Next occurrence** is the first date after the due date that is also after today.
  Finishing a daily task three days late schedules tomorrow, not three overdue copies.
- **Constraints**: a rule needs a due date (choosing one on an undated task starts the
  series at its first fitting day; clearing the date clears the rule) and never applies to
  subtasks. Both are enforced in the server actions, not only in the UI.
- **One action, one undo**: `rollTask` moves the date and sets the listed subtasks' status
  in a single transaction. Undo calls it with the old date and re-completes exactly the
  subtasks it reopened. The toast says where the task went ("Done · next Thursday").
- **Input**: quick add understands "daily", "every weekday", "every mon and thu",
  "every 2 weeks", "monthly on the 15th", "every year" …; bare adverbs only count at the
  end ("review weekly" repeats, "weekly review" is a title). The detail panel offers
  presets anchored to the due date plus a free-text field using the same grammar.

## Consequences

- No completion history per occurrence yet. When the time room needs streaks or reports,
  add a `task_completion` log written by `rollTask`; the row model stays.
- No end dates or "after N times" yet; the jsonb rule can grow (`until`, `count`) without
  a migration.
- Occurrences are computed against the user's floating "today" (ADR 0006); a stored
  user-level time zone will matter once reminders exist.
