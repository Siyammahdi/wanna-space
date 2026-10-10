"use client";

import { Check, ChevronDown, CircleSlash, Search } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { Popover } from "@/components/ui/popover";
import { colorOf } from "@/features/tasks";
import { cn } from "@/lib/cn";

import type { TaskChoice } from "../schema";

type PickedTask = { id: string; title: string } | null;

/** Picks an open task to attach time to (or none). */
export function TaskPicker({
  choices,
  value,
  onChange,
  placeholder = "What are you working on?",
  align = "start",
  className,
  disabled,
}: {
  choices: TaskChoice[];
  value: PickedTask;
  onChange: (task: PickedTask) => void;
  placeholder?: string;
  align?: "start" | "end";
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const picked = value ? choices.find((c) => c.id === value.id) : undefined;
  const q = query.trim().toLowerCase();
  const shown = (q ? choices.filter((c) => c.title.toLowerCase().includes(q)) : choices).slice(
    0,
    60,
  );

  const choose = (task: PickedTask) => {
    onChange(task);
    setOpen(false);
    setQuery("");
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      document.getElementById(listId)?.querySelector<HTMLElement>("button")?.focus();
    } else if (e.key === "Enter" && shown[0]) {
      e.preventDefault();
      choose({ id: shown[0].id, title: shown[0].title });
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      label="Choose a task"
      align={align}
      className="w-80 max-w-[calc(100vw-2.5rem)] p-1.5"
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-9 max-w-full min-w-0 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-60",
            value ? "text-ink" : "text-ink-subtle",
            className,
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              value
                ? picked?.projectColor
                  ? colorOf(picked.projectColor).dot
                  : "bg-ink-faint"
                : "bg-ink-faint/50",
            )}
          />
          <span className="truncate">{value?.title ?? placeholder}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-faint" />
        </button>
      }
    >
      <div className="flex items-center gap-2 rounded-md bg-surface-sunken px-2.5">
        <Search className="size-3.5 shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Find a task…"
          aria-label="Find a task"
          aria-controls={listId}
          className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <div id={listId} className="mt-1 max-h-72 overflow-y-auto">
        {value && (
          <PickerItem onSelect={() => choose(null)}>
            <CircleSlash className="size-3.5 text-ink-faint" />
            <span className="flex-1 truncate">No task</span>
          </PickerItem>
        )}
        {shown.map((c) => (
          <PickerItem key={c.id} onSelect={() => choose({ id: c.id, title: c.title })}>
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                c.projectColor ? colorOf(c.projectColor).dot : "bg-ink-faint",
              )}
            />
            <span className="flex-1 truncate">{c.title}</span>
            {c.projectName && (
              <span className="max-w-24 shrink-0 truncate text-[12px] text-ink-faint">
                {c.projectName}
              </span>
            )}
            {value?.id === c.id && <Check className="size-3.5 shrink-0 text-room-time" />}
          </PickerItem>
        ))}
        {shown.length === 0 && (
          <p className="px-2.5 py-3 text-[13px] text-ink-subtle">
            {choices.length ? "No open task matches." : "No open tasks yet."}
          </p>
        )}
      </div>
    </Popover>
  );
}

function PickerItem({ onSelect, children }: { onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:-outline-offset-2"
    >
      {children}
    </button>
  );
}
