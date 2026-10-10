import { AlignLeft, CalendarDays, Flag, ListChecks, Repeat } from "lucide-react";

import { useSettings } from "@/components/shell/settings-context";
import { cn } from "@/lib/cn";
import { describeDue, formatTime, type DueTone, type IsoDate } from "@/lib/dates";

import type { Priority } from "../parse";
import { colorOf, type ProjectColor } from "../projects";
import { describeRepeat, type RepeatRule } from "../repeat";

export const priorityMeta: Record<
  Exclude<Priority, 0>,
  { label: string; text: string; ring: string }
> = {
  1: { label: "Priority 1", text: "text-warning", ring: "border-warning" },
  2: { label: "Priority 2", text: "text-room-time", ring: "border-room-time" },
  3: { label: "Priority 3", text: "text-ink-subtle", ring: "" },
};

const dueToneClass: Record<DueTone, string> = {
  overdue: "text-warning",
  today: "text-accent-ink",
  soon: "text-room-planner",
  later: "text-ink-subtle",
};

export function DueLabel({
  date,
  time,
  today,
  className,
}: {
  date: IsoDate;
  time?: string | null;
  today: IsoDate;
  className?: string;
}) {
  const { label, tone } = describeDue(date, today);
  const { timeFormat } = useSettings();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium",
        dueToneClass[tone],
        className,
      )}
    >
      <CalendarDays className="size-3.5" strokeWidth={2} />
      {label}
      {time && <span className="opacity-80">· {formatTime(time, timeFormat)}</span>}
    </span>
  );
}

/** Subtask progress and a notes marker, shown in the row's meta line. */
export function DetailHints({
  done,
  total,
  notes,
}: {
  done: number;
  total: number;
  notes: boolean;
}) {
  return (
    <>
      {total > 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums",
            done === total ? "text-room-tasks" : "text-ink-subtle",
          )}
        >
          <ListChecks className="size-3.5" strokeWidth={2} />
          {done}/{total}
        </span>
      )}
      {notes && (
        <span className="inline-flex items-center text-ink-subtle" title="Has notes">
          <AlignLeft className="size-3.5" strokeWidth={2} />
        </span>
      )}
    </>
  );
}

export function RepeatLabel({ rule }: { rule: RepeatRule }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-subtle">
      <Repeat className="size-3.5" strokeWidth={2} aria-hidden />
      <span>
        <span className="sr-only">Repeats </span>
        {describeRepeat(rule)}
      </span>
    </span>
  );
}

export function ProjectLabel({ name, color }: { name: string; color: ProjectColor }) {
  return (
    <span className="inline-flex max-w-40 items-center gap-1.5 text-[12px] font-medium text-ink-subtle">
      <span className={cn("size-2 shrink-0 rounded-full", colorOf(color).dot)} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: Priority }) {
  if (priority === 0) return null;
  const meta = priorityMeta[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", meta.text)}>
      <Flag className="size-3.5" strokeWidth={2} fill="currentColor" fillOpacity={0.2} />P{priority}
    </span>
  );
}
