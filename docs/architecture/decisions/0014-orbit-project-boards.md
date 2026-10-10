# 0014 — Orbit: projects as boards of stages

- Status: Accepted
- Date: 2026-10-09

## Context

Tasks already belong to projects, but a project was only a filtered list. People running
something bigger (a launch, a move, a client job) want to see where every piece stands,
what's stuck, and whether it will land on time. That's a board: columns for the stages
work passes through, a brief, a target date, and a sense of health.

We didn't want a second kind of "card" with its own data. A board should be another view
of the same tasks, so a task moved on the board is the same task in Tasks, Today and the
Planner, with the same menu, detail panel and undo.

## Decision

- **Orbit is a room** (`/orbit`, glacier hue) with an overview of every project and a
  board per project (`/orbit/[projectId]`). Project pages in Tasks link to their board and
  back ("Open as list").
- **Projects gain board fields** (migration `0009`): `icon` (one emoji), `description`
  (the brief), `status` (`planning` / `active` / `paused` / `complete`, shown as Planning,
  In orbit, Paused, Landed) and `target_date` (a floating date, like due dates).
- **Stages are rows** (`project_stage`: name, `sort_key`, optional `wip_limit` 1–99), and
  a task points at one with `task.stage_id` (set null when the stage goes). Every project
  gets the user's default stages when created (`user_settings.default_stages`, "To do,
  In progress, Review" unless changed); the migration backfilled them for existing
  projects. A project keeps at least one stage and at most 16.
- **Done is built in, not a stage.** The last column is `status = 'done'`, so completing a
  task anywhere moves it there and dragging into Done completes it (dragging out reopens
  it). Done is ordered by `completed_at`, newest first, and shows the latest 12 with
  "Show more".
- **Display rules, not repairs.** An open task whose `stage_id` is null or belongs to
  another project shows in the first stage; nothing rewrites it until the user moves it.
  This keeps moves between projects, deleted stages and quick adds simple. `updateTask`
  clears `stage_id` when the project changes, and every action checks that a stage
  belongs to the task's project and space.
- **Order within a stage** reuses `task.sort_key` (ADR 0008). Keys are computed on the
  client between the neighbours in the target column, so the order in a stage and in the
  project's list view stay consistent.
- **Deleting a stage** returns a snapshot (the stage and its task ids). Its tasks fall back
  to the first stage by the display rule; undo re-inserts the stage with the same id and
  moves back only those tasks still without a stage.
- **WIP limits** are advice, not rules: the column count turns to the warning tone past the
  limit, but drops are never refused.
- **Health** is derived, never stored, and only for projects In orbit with open work:
  _Past target_ when the target date has passed, _At risk_ with overdue tasks or when the
  target is a week away and less than half is done, otherwise _On track_. Both warning
  states use the warning hue; red stays reserved for danger.
- **Keyboard and mouse parity.** Cards take focus; arrows walk the board, `Alt`/`⌥` +
  arrows move a card between and within stages, `x`, `Delete`, `0`–`3` and the menu key
  work as in Tasks. Every one of those actions is also in the card's menu, the column's
  menu (rename, WIP limit, move left/right, delete) or a drag.

## Consequences

- Boards add no task-shaped data: counts, progress and health come from task rows in one
  grouped query per page (`features/orbit/server/queries.ts`).
- Subtasks never appear on boards; their parent's card shows their progress.
- A stage can't be shared across projects, and boards can't group by anything other than
  stage (priority or due date swimlanes would be a new view, not a schema change).
- The JSON export (version 2) includes project fields, stages and `stageId` on tasks.
