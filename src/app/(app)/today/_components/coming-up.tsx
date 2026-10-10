"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { Card } from "@/components/ui/card";
import { colorOf, type ProjectItem, type TaskItem } from "@/features/tasks";
import { minuteOf } from "@/features/time/report";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/dates";

import { useMinute } from "./use-minute";

/** Today's timed tasks as a short agenda, with a line for now. */
export function ComingUp({
  tasks,
  projects,
  tomorrow,
  onOpen,
  className,
}: {
  /** Open, due today, with a time. */
  tasks: TaskItem[];
  projects: ProjectItem[];
  /** How many tasks are due tomorrow. */
  tomorrow: number;
  onOpen: (id: string) => void;
  className?: string;
}) {
  const { timeFormat } = useSettings();
  const minute = useMinute();
  const timed = tasks.toSorted((a, b) => a.dueTime!.localeCompare(b.dueTime!));
  const nowAt = minute === null ? -1 : timed.findIndex((t) => minuteOf(t.dueTime!) > minute);
  const linePos = nowAt === -1 ? timed.length : nowAt;

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <h2 className="text-[13px] font-semibold text-ink">Coming up</h2>

      {timed.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ink-subtle">
          Nothing on the clock. Add a time to a task (“call Sam 3pm”) and it lines up here.
        </p>
      ) : (
        <ol className="-mx-2 flex flex-col">
          {timed.map((t, i) => {
            const past = minute !== null && minuteOf(t.dueTime!) <= minute;
            const project = projects.find((p) => p.id === t.projectId);
            return (
              <Fragment key={t.id}>
                {minute !== null && i === linePos && <NowLine />}
                <li>
                  <button
                    type="button"
                    onClick={() => onOpen(t.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-hover",
                      past && "opacity-55",
                    )}
                  >
                    <span className="w-[4.25rem] shrink-0 text-[12.5px] text-ink-subtle tabular-nums">
                      {formatTime(t.dueTime!, timeFormat)}
                    </span>
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        project ? colorOf(project.color).dot : "bg-room-planner",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                      {t.title}
                    </span>
                  </button>
                </li>
              </Fragment>
            );
          })}
          {minute !== null && linePos === timed.length && <NowLine />}
        </ol>
      )}

      <Link
        href="/planner"
        className="-mx-2 mt-auto flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <span>
          Tomorrow ·{" "}
          {tomorrow === 0 ? "nothing yet" : tomorrow === 1 ? "1 task" : `${tomorrow} tasks`}
        </span>
        <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  );
}

function NowLine() {
  return (
    <li aria-hidden className="flex items-center gap-2 px-2 py-0.5">
      <span className="size-1.5 rounded-full bg-accent" />
      <span className="h-px flex-1 bg-accent/50" />
    </li>
  );
}
