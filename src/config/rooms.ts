import {
  Archive,
  CalendarDays,
  ListChecks,
  NotebookPen,
  Sun,
  Timer,
  type LucideIcon,
} from "lucide-react";

/**
 * A "room" is a top-level module of the space. This registry is the single
 * source of truth for navigation, theming hue, and copy — add a module here
 * and it appears in the sidebar, landing page, and design reference.
 */
export type RoomId = "today" | "tasks" | "planner" | "notes" | "time" | "vault";

export type Room = {
  id: RoomId;
  label: string;
  href: `/${RoomId}`;
  icon: LucideIcon;
  tagline: string;
  description: string;
  /** Tailwind classes bound to the room's hue tokens (see tokens.css). */
  tone: { text: string; bg: string; soft: string; ring: string };
  status: "building" | "planned";
};

export const rooms: readonly Room[] = [
  {
    id: "today",
    label: "Today",
    href: "/today",
    icon: Sun,
    tagline: "Your day, at a glance",
    description: "What's due, what's scheduled, and where your time is going — in one calm view.",
    tone: {
      text: "text-room-today",
      bg: "bg-room-today",
      soft: "bg-room-today-soft",
      ring: "ring-room-today/30",
    },
    status: "building",
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: ListChecks,
    tagline: "Capture, sort, finish",
    description: "Quick capture, projects, priorities and due dates without the clutter.",
    tone: {
      text: "text-room-tasks",
      bg: "bg-room-tasks",
      soft: "bg-room-tasks-soft",
      ring: "ring-room-tasks/30",
    },
    status: "building",
  },
  {
    id: "planner",
    label: "Planner",
    href: "/planner",
    icon: CalendarDays,
    tagline: "Shape your week",
    description: "Drag tasks onto your days and block out time for what matters.",
    tone: {
      text: "text-room-planner",
      bg: "bg-room-planner",
      soft: "bg-room-planner-soft",
      ring: "ring-room-planner/30",
    },
    status: "planned",
  },
  {
    id: "notes",
    label: "Notes",
    href: "/notes",
    icon: NotebookPen,
    tagline: "Think in pages",
    description: "A block editor for documents, journals and ideas that link to everything else.",
    tone: {
      text: "text-room-notes",
      bg: "bg-room-notes",
      soft: "bg-room-notes-soft",
      ring: "ring-room-notes/30",
    },
    status: "planned",
  },
  {
    id: "time",
    label: "Time",
    href: "/time",
    icon: Timer,
    tagline: "Focus and track",
    description: "Focus sessions and time tracking that quietly feed your planner.",
    tone: {
      text: "text-room-time",
      bg: "bg-room-time",
      soft: "bg-room-time-soft",
      ring: "ring-room-time/30",
    },
    status: "planned",
  },
  {
    id: "vault",
    label: "Vault",
    href: "/vault",
    icon: Archive,
    tagline: "Keep what inspires you",
    description:
      "Save websites, designs, components, images and files — searchable, tagged, yours.",
    tone: {
      text: "text-room-vault",
      bg: "bg-room-vault",
      soft: "bg-room-vault-soft",
      ring: "ring-room-vault/30",
    },
    status: "planned",
  },
];

export function getRoom(id: RoomId): Room {
  const room = rooms.find((r) => r.id === id);
  if (!room) throw new Error(`Unknown room: ${id}`);
  return room;
}
