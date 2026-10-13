# 0021 — Instant navigation between rooms

- Status: Accepted
- Date: 2026-10-10

## Context

Every room is dynamic: it reads the session and the user's data. Without Cache Components,
Next prefetches a dynamic route only if it has a `loading.tsx`, and no room had one. So a
click did nothing visible until the server had rendered the whole page: 200 ms to 1 s on a
production build, with the old page frozen and the sidebar highlight unmoved. Some pages
also waited on one query before starting the next.

## Decision

- **A `loading.tsx` per room, and per sub-view.** Today, Tasks (and its lists), Planner,
  Orbit (and a board), Notes (overview and a page), Time and the Vault each draw a
  skeleton in the room's real layout (design system → Loading states). Next prefetches
  it with the link, so the URL, the highlight and the skeleton change on the next frame
  even on a slow network.
- **Nothing above a loading boundary holds data.** Next keeps a prefetched loading state
  and the layouts above it for minutes, and the `refresh()` our actions call doesn't
  evict them. So room layouts only wrap `<RoomTransition>` (and the Tasks header); the
  layouts that do load data move into route groups below the boundary:
  `tasks/(lists)/layout.tsx` (projects and Inbox count) and `notes/(tree)/layout.tsx`
  (the page tree). URLs don't change.
- **`<RoomTransition>` lives in each room's layout**, around the loading boundary: the
  skeleton enters the way the room does, and the swap to real content is not animated
  (rooms behind a skeleton dropped their `<Reveal>` entrances). An Orbit board keeps its own transition so
  opening one from the overview still rises in. The enter animation is `--duration-base`:
  React holds streamed content until a running view transition ends.
- **One query round per page.** Today runs everything alongside the day plan (only today's
  list waits for its picks); a project's task page and an Orbit board run the project
  lookup with the task lists. Those lists are space-scoped, so a stranger's id finds
  nothing; `isUuid` turns a malformed id into a 404 before any query runs.
- **Skeletons are exact.** Each is built from its room's real markup, and draws for real
  whatever the client already has: static labels and buttons, the viewer's name and
  today, settings, the running timer, the app shell's projects (`ShellProjectsProvider`
  in the app layout) and, inside Notes, the page tree. Only data waits, as bars in the
  real line boxes, so the swap moves nothing.
- **The nav answers the click.** `useNavTarget` (sidebar, mobile nav) moves the highlight
  in Link's `onNavigate`, before the URL changes, and falls back to the URL once it does.

## Alternatives considered

- **`staleTimes.dynamic`** (keep visited rooms in the client cache): instant on revisits,
  but some writes don't call `refresh()` (a page's autosave, the day's intention), so a
  revisit could show an older page and autosave it back. Rejected.
- **`prefetch={true}` on nav links** (prefetch the full page with its data): same staleness
  for five minutes, and every visible link would render a full room on the server.
- **Cache Components + Partial Prefetching**: the long-term route to a static shell per
  room, but it reshapes every data read around `"use cache"` and Suspense. Worth revisiting
  once the rooms settle.

## Consequences

- A click shows its room on the next frame; content follows in ~300 ms (React keeps a
  fallback up at least that long) plus the server's data time.
- New rooms and sub-views need a `loading.tsx`, and their layouts must stay data-free
  above it.
- Skeletons duplicate a room's outline; when a room's layout changes, its skeleton should
  change with it.
