# 0009 — The Planner starts as a week board over tasks

- Status: Accepted
- Date: 2026-10-08

## Context

The Planner's job is to shape the week: decide which day each task gets. Time blocks
(an hour grid) come later and need new data; the first slice should be useful on its own
and reuse what Tasks already does well (optimistic updates, undo, the detail panel).

## Decision

- **No new data.** A day is a task's `due_date`; placing a task on a day is the same
  `updateTask` call Tasks makes, ordered with the same rules (`placeAt`, ADR 0008).
- **One read** (`listPlannerTasks`): open tasks due in the week, every overdue or undated
  open task (the tray), and the week's completed tasks, with subtasks.
- **Weeks start on Saturday** by default (`features/planner/week.ts`); `?week=` takes any
  date and selects its week. Since ADR 0010 the start day is the user's "Week starts on"
  setting (Saturday, Sunday or Monday).
- **The past is read-only.** Past days list what was done; open tasks from them show once,
  in Overdue, where they can be dragged onto a day. Nothing can be dropped into the past.
- **Cross-feature access** goes through `features/tasks/index.ts`, a small client-safe
  public API (card pieces, `TaskDetail`, `TaskMenu`, `useTasks`, `placeAt`, the parser).
- **Drag and drop** is `@dnd-kit` with one sortable list per lane, moving the card between
  lanes as it's dragged (so lanes make room), a `DragOverlay` copy under the pointer, and
  the dropped arrangement held for a moment so the optimistic update paints without a
  flicker. The keyboard has the same reach: `Alt` + arrows on a focused card.

## Consequences

- A task can only be on one day; multi-day work and time blocks need a `scheduled_*`
  model (next slice) that sits alongside `due_date` rather than replacing it.
- Undated tasks can pile up in the tray. Below 1536px it's a single sideways strip (one
  element restyled by breakpoint, since dnd-kit needs each card rendered once) that can be
  toggled away; filtering by project is a likely next step.
