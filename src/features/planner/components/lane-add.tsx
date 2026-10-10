"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { parseTaskInput, type ProjectItem, type TaskActions } from "@/features/tasks";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";

/**
 * "Add task" at the foot of a day (or No date). Typing understands the quick-add grammar
 * (“Call the bank 5pm p1 #home”); without a written date the task lands on this day.
 */
export function LaneAdd({
  date,
  label,
  today,
  projects,
  onAdd,
}: {
  date: IsoDate | null;
  /** Accessible name of the field, e.g. "New task for Saturday, October 10". */
  label: string;
  today: IsoDate;
  projects: ProjectItem[];
  onAdd: TaskActions["add"];
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text) return;
    const parsed = parseTaskInput(text, today, projects);
    const dueDate = parsed.dueDate ?? date;
    onAdd({
      id: uuidv7(),
      title: parsed.title,
      dueDate,
      dueTime: dueDate ? parsed.dueTime : null,
      repeat: parsed.repeat,
      priority: parsed.priority,
      projectId: parsed.projectId,
      parentId: null,
    });
    setValue("");
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-faint transition-colors hover:bg-surface-hover/60 hover:text-ink-muted"
      >
        <Plus className="size-3.5" />
        Add task
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      aria-label={label}
      placeholder="Task name"
      maxLength={500}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          e.stopPropagation();
          setValue("");
          setEditing(false);
        }
      }}
      onBlur={() => {
        submit();
        setEditing(false);
      }}
      className={cn(
        "h-9 w-full rounded-md bg-surface-raised px-2.5 text-[13.5px] text-ink outline-none",
        "placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40",
      )}
    />
  );
}
