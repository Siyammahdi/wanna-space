# Data model (draft)

Status: **proposal** — finalized in Phase 1 and refined per room as each is built.

## Core ideas

1. **Everything belongs to a space.** Each user gets one personal space at sign-up. Every
   domain row carries `space_id`. Shared spaces later are then a membership table, not a
   migration of every table.
2. **Separate tables per room, plus shared connective tissue.** Rooms have different shapes
   (a task isn't a vault item), so each gets its own table. Tags and cross-room links are
   generic.
3. **Time-sortable IDs.** UUIDv7 generated in the app — sortable, safe to expose, no
   sequence contention.
4. **Fractional ordering.** User-ordered lists use a string `sort_key` (fractional index) so
   a reorder touches one row.
5. **Soft archive, hard delete.** `archived_at` for things users may want back; real
   deletes for everything else (and for account deletion).

## Entities

```
user ─┬─ session / account / verification     (managed by Better Auth)
      └─ space_member ── space
                           ├── project ── task (parent_id → task for subtasks)
                           ├── time_block           (planner)
                           ├── time_entry           (time tracking, optional task_id)
                           ├── page ── (content JSON)   (notes)
                           ├── vault_item ── collection
                           ├── tag ── tagging (tag_id, entity_type, entity_id)
                           └── link (from_type, from_id, to_type, to_id)
```

### Sketch of the first tables (Phase 1–2)

| Table          | Key columns                                                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `space`        | id, name, created_at                                                                                                                                                                |
| `space_member` | space_id, user_id, role (`owner` for now)                                                                                                                                           |
| `project`      | id, space_id, name, icon, color, sort_key, archived_at                                                                                                                              |
| `task`         | id, space_id, project_id?, parent_id?, title, notes, status (`open`/`done`), priority (0–3), due_date?, due_time?, scheduled_date?, completed_at?, sort_key, created_at, updated_at |

Vault, notes, and time tables are designed when their phase starts.
