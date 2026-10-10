"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { recordUndo } from "@/components/shell/undo";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";

import type { TaskChoice } from "../schema";
import { deleteEntries, logTime, restoreEntries } from "../server/actions";
import { formatDuration } from "../timer";
import { TaskPicker } from "./task-picker";

const PRESETS = [15, 25, 30, 45, 60, 90];

const field =
  "h-9 w-full rounded-md bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-hover";

/** "HH:MM" `minutes` ago, on the local clock. */
function timeAgo(minutes: number) {
  const d = new Date(Date.now() - minutes * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Adds time the timer didn't see: a task, a day, a start and a duration. */
export function LogTime({ choices, today }: { choices: TaskChoice[]; today: IsoDate }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [minutes, setMinutes] = useState(25);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openForm = () => {
    setDate(today);
    setStart(timeAgo(minutes));
    setError(null);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await logTime({ taskId: task?.id ?? null, date, start, minutes, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      const entry = result.entry;
      recordUndo(
        {
          label: task?.title ?? "Time entry",
          undo: () => void deleteEntries([entry.id]),
          redo: () => void restoreEntries([entry]),
        },
        `Logged ${formatDuration(entry.seconds)}`,
      );
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Log time"
      align="end"
      className="w-80 max-w-[calc(100vw-2.5rem)] p-3"
      trigger={
        <Button
          variant="secondary"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openForm())}
        >
          <Plus /> Log time
        </Button>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-ink">Log time by hand</p>
        <TaskPicker
          choices={choices}
          value={task}
          onChange={setTask}
          placeholder="No task"
          className="w-full bg-surface-sunken hover:bg-surface-hover"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[12px] text-ink-subtle">
            Day
            <input
              type="date"
              required
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-subtle">
            Started at
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-[12px] text-ink-subtle">Duration</legend>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "h-7 rounded-sm px-2.5 text-[12.5px] font-medium tabular-nums transition-colors",
                  minutes === m
                    ? "bg-room-time-soft text-room-time"
                    : "bg-surface-sunken text-ink-muted hover:bg-surface-hover hover:text-ink",
                )}
              >
                {formatDuration(m * 60)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-ink-subtle">
            <input
              type="number"
              min={1}
              max={1440}
              required
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.round(Number(e.target.value))))}
              aria-label="Minutes"
              className={cn(field, "w-20 tabular-nums")}
            />
            minutes
          </label>
        </fieldset>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Note (optional)"
          aria-label="Note"
          className={field}
        />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" size="sm" disabled={pending || minutes < 1}>
            Log {minutes >= 1 ? formatDuration(minutes * 60) : ""}
          </Button>
        </div>
      </form>
    </Popover>
  );
}
