import { Card } from "@/components/ui/card";
import { colorOf } from "@/features/tasks";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/dates";
import type { TimeFormat } from "@/lib/settings";

import { daySpan, secondsByTask, totalSeconds } from "../report";
import type { TimeEntryItem } from "../schema";
import { formatDuration } from "../timer";

const HOURS = [0, 6, 12, 18, 24];

/** Today at a glance: total focus, sessions, where they fell, and what got the time. */
export function DaySummary({
  entries,
  timeFormat,
  goal,
}: {
  entries: TimeEntryItem[];
  timeFormat: TimeFormat;
  /** Daily focus goal in minutes; 0 means no goal. */
  goal: number;
}) {
  const total = totalSeconds(entries);
  const tasks = secondsByTask(entries).slice(0, 4);
  const progress = goal ? Math.min(1, total / (goal * 60)) : 0;

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Today</h2>
          <p className="mt-1.5 font-heading text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {total ? formatDuration(total) : "0m"}
          </p>
        </div>
        <p className="pt-0.5 text-[12.5px] text-ink-subtle">
          {entries.length === 1 ? "1 session" : `${entries.length} sessions`}
        </p>
      </div>

      {goal > 0 && (
        <div>
          <div
            role="progressbar"
            aria-label="Daily focus goal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(goal, Math.round(total / 60))}
            className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
          >
            <div
              className="h-full origin-left rounded-full bg-room-time transition-transform duration-700 ease-out"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-subtle tabular-nums">
            {progress >= 1
              ? `Goal reached · ${formatDuration(goal * 60)}`
              : `${formatDuration(Math.max(0, goal * 60 - total))} to your ${formatDuration(goal * 60)} goal`}
          </p>
        </div>
      )}

      <div>
        <div className="relative h-7 overflow-hidden rounded-sm bg-surface-sunken">
          {entries.map((e) => {
            const { from, to } = daySpan(e);
            return (
              <span
                key={e.id}
                title={`${formatTime(e.start, timeFormat)} – ${formatTime(e.end, timeFormat)} · ${e.taskTitle ?? "No task"}`}
                className={cn(
                  "absolute inset-y-1 min-w-[3px] rounded-[3px]",
                  e.projectColor ? colorOf(e.projectColor).dot : "bg-room-time",
                )}
                style={{ left: `${(from / 1440) * 100}%`, width: `${((to - from) / 1440) * 100}%` }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-faint tabular-nums">
          {HOURS.map((h) => (
            <span key={h}>{formatTime(`${h % 24}:00`, timeFormat)}</span>
          ))}
        </div>
      </div>

      {tasks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => (
            <li key={t.key} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  t.projectColor ? colorOf(t.projectColor).dot : "bg-ink-faint",
                )}
              />
              <span
                className={cn("min-w-0 flex-1 truncate", t.title ? "text-ink" : "text-ink-subtle")}
              >
                {t.title ?? "No task"}
              </span>
              <span className="text-ink-muted tabular-nums">{formatDuration(t.seconds)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-relaxed text-ink-subtle">
          Start the timer and today’s focus will add up here.
        </p>
      )}
    </Card>
  );
}
