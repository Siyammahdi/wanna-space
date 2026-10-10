/** Project colors reuse the room hues, so they always sit well together. */
export const projectColors = {
  fern: {
    label: "Fern",
    dot: "bg-room-tasks",
    text: "text-room-tasks",
    soft: "bg-room-tasks-soft",
  },
  teal: {
    label: "Teal",
    dot: "bg-room-planner",
    text: "text-room-planner",
    soft: "bg-room-planner-soft",
  },
  blue: { label: "Blue", dot: "bg-room-time", text: "text-room-time", soft: "bg-room-time-soft" },
  lavender: {
    label: "Lavender",
    dot: "bg-room-vault",
    text: "text-room-vault",
    soft: "bg-room-vault-soft",
  },
  honey: {
    label: "Honey",
    dot: "bg-room-today",
    text: "text-room-today",
    soft: "bg-room-today-soft",
  },
  olive: {
    label: "Olive",
    dot: "bg-room-notes",
    text: "text-room-notes",
    soft: "bg-room-notes-soft",
  },
  glacier: {
    label: "Glacier",
    dot: "bg-room-orbit",
    text: "text-room-orbit",
    soft: "bg-room-orbit-soft",
  },
} as const;

export type ProjectColor = keyof typeof projectColors;

export const PROJECT_COLORS = Object.keys(projectColors) as ProjectColor[];

export const colorOf = (color: string) =>
  projectColors[(color in projectColors ? color : "fern") as ProjectColor];

/** Cycles through the palette so new projects don't all look alike. */
export const nextProjectColor = (count: number): ProjectColor =>
  PROJECT_COLORS[count % PROJECT_COLORS.length]!;
