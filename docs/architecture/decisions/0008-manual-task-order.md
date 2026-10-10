# 0008 — Manual task order lives inside the date order

- Status: Accepted
- Date: 2026-10-08

## Context

People want to arrange their tasks by hand ("this first, then that"), but the board is
also organized by date: Overdue, Today, Upcoming, No date, with timed tasks in time order.
A free-form order would fight the dates; a pure date order leaves no room for priority by
position. Dragging also has to say what happens when a task crosses a section.

## Decision

- **Sort**: date, then time (timed first), then `sort_key` (`compareTasks`,
  `features/tasks/order.ts`). The manual order applies among tasks due at the same moment —
  in practice, the untimed tasks of a day, and the No date list.
- **Dropping sets the date of where it lands**: Today → today; No date → no date (refused
  for a repeating task, which needs a date); Upcoming → the date of the task above it
  (below, at the top; tomorrow, if Upcoming is empty). Overdue only accepts overdue tasks
  and keeps their date — an overdue date is a fact, not a slot.
- **Keys are computed on the client** between the neighbours that share the new date and
  time (`fractional-indexing`), and saved with the date through `updateTask`. One update,
  so undo/redo and optimistic paint come for free. Drops that wouldn't change anything are
  ignored; a timed task keeps its time and settles into time order.
- **The keyboard is first-class**: `Alt`+`↑`/`↓` moves the cursor's task one step with the
  same rules (`stepTask`), skipping positions where it wouldn't actually move.
- **Library**: `@dnd-kit/core` + `@dnd-kit/sortable` — mouse (6 px activation) and touch
  (250 ms long-press) sensors, auto-scroll, live-region announcements with task titles. The
  sortable transform goes on an inner wrapper; the row's `<li>` keeps its motion layout
  animations, which pause during a drag and for a moment after the drop.

## Consequences

- Two people reordering the same spot at once can produce equal keys; ties are harmless
  (arbitrary order) and the next move separates them.
- Keys grow when you repeatedly insert between the same two tasks; the schema allows 128
  characters. A rebalancing job can be added if that's ever reached.
- The Today room's list and subtasks aren't draggable yet; the Planner will reuse
  `placeTask` for dropping tasks onto days.
