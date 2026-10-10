import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { colorOf } from "@/features/tasks";
import { cn } from "@/lib/cn";
import { addDays, daysBetween, type IsoDate } from "@/lib/dates";
import { dayName, longDay, weekDays, weekLabel } from "@/lib/week";

import { secondsByDay, secondsByTask, totalSeconds } from "../report";
import type { TimeEntryItem } from "../schema";
import { formatDuration } from "../timer";

const weekHref = (start: IsoDate) => `/time?week=${start}` as Route;

/** The week in numbers: total, average, best day, a bar per day, and time per task. */
export function WeekReport({
  entries,
  start,
  today,
  currentWeek,
}: {
  entries: TimeEntryItem[];
  start: IsoDate;
  today: IsoDate;
  currentWeek: IsoDate;
}) {
  const days = weekDays(start);
  const perDay = secondsByDay(entries, days);
  const total = totalSeconds(entries);
  const max = Math.max(...perDay, 1);
  const best = perDay.indexOf(Math.max(...perDay));
  const elapsedDays = Math.max(0, Math.min(7, daysBetween(start, today) + 1));
  const tasks = secondsByTask(entries);
  const topTask = tasks[0]?.seconds ?? 1;

  return (
    <Card className="flex flex-col gap-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          {start === currentWeek ? "This week" : weekLabel(start)}
        </h2>
        <nav aria-label="Weeks" className="-my-1 flex items-center gap-0.5">
          {start !== currentWeek && (
            <Link href="/time" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              This week
            </Link>
          )}
          <Link
            href={weekHref(addDays(start, -7))}
            aria-label="Previous week"
            title="Previous week"
            scroll={false}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronLeft />
          </Link>
          <Link
            href={weekHref(addDays(start, 7))}
            aria-label="Next week"
            title="Next week"
            scroll={false}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronRight />
          </Link>
        </nav>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={total ? formatDuration(total) : "0m"} />
        <Stat
          label="Daily average"
          value={elapsedDays && total ? formatDuration(total / elapsedDays) : "—"}
        />
        <Stat
          label="Best day"
          value={total ? dayName(days[best]!) : "—"}
          detail={total ? formatDuration(perDay[best]!) : undefined}
        />
      </dl>

      <div className="grid h-40 grid-cols-7 gap-2" role="list" aria-label="Focus per day">
        {days.map((day, i) => {
          const seconds = perDay[i]!;
          const isToday = day === today;
          return (
            <div
              key={day}
              role="listitem"
              aria-label={`${longDay(day)}: ${seconds ? formatDuration(seconds) : "no focus"}`}
              className="flex min-w-0 flex-col items-center gap-2"
            >
              <div className="relative flex w-full flex-1 items-end justify-center overflow-hidden rounded-md bg-surface-sunken/45">
                {seconds > 0 && (
                  <span
                    className={cn(
                      "w-full origin-bottom animate-grow rounded-md",
                      isToday ? "bg-room-time" : "bg-room-time/55",
                    )}
                    style={{
                      height: `max(6px, ${(seconds / max) * 100}%)`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                )}
              </div>
              <span className="flex flex-col items-center leading-tight">
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    isToday ? "text-room-time" : "text-ink-muted",
                  )}
                >
                  {dayName(day)}
                </span>
                <span className="text-[11px] text-ink-faint tabular-nums">
                  {seconds ? formatDuration(seconds) : "·"}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {tasks.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-[12px] font-medium tracking-[0.06em] text-ink-faint uppercase">
            By task
          </h3>
          <ul className="flex flex-col gap-3">
            {tasks.slice(0, 6).map((t) => (
              <li key={t.key} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      t.title ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {t.title ?? "No task"}
                  </span>
                  {t.projectName && (
                    <span className="hidden max-w-32 truncate text-[12px] text-ink-faint sm:inline">
                      {t.projectName}
                    </span>
                  )}
                  <span className="text-ink-muted tabular-nums">{formatDuration(t.seconds)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      t.projectColor ? colorOf(t.projectColor).dot : "bg-room-time",
                    )}
                    style={{ width: `${(t.seconds / topTask) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-sunken/60 px-3 py-2.5">
      <dt className="truncate text-[11.5px] text-ink-subtle">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="font-heading text-[19px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
          {value}
        </span>
        {detail && <span className="truncate text-[11.5px] text-ink-faint">{detail}</span>}
      </dd>
    </div>
  );
}
