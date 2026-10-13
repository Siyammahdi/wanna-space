"use client";

import { Inbox, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useSettings } from "@/components/shell/settings-context";
import { useViewer } from "@/components/shell/viewer";
import { SkeletonLine, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import { dayName, dayNumber, weekDays, weekFromParam, weekLabel } from "../week";
import { WeekNav } from "./week-nav";

/**
 * WeekBoard before its tasks arrive. The week itself is known on the client (the URL, the
 * "Week starts on" setting and the viewer's today), so the title, nav and day headers are
 * the real ones; only the counts and the tasks are placeholders.
 */
export function WeekSkeleton() {
  const { today } = useViewer();
  const { weekStartsOn } = useSettings();
  const start = weekFromParam(useSearchParams().get("week") ?? undefined, today, weekStartsOn);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="font-heading text-[19px] font-semibold tracking-[-0.015em] text-ink">
            {weekLabel(start)}
          </h2>
          <p className="text-[12.5px] text-ink-subtle">
            <SkeletonText className="h-3 w-16" />
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="flex h-8 items-center gap-1.5 rounded-md bg-surface-hover px-2.5 text-[13px] font-medium text-ink 2xl:hidden">
            <Inbox className="size-[15px]" />
            Unscheduled
            <SkeletonText className="h-2.5 w-3" />
          </span>
          <WeekNav start={start} today={today} weekStartsOn={weekStartsOn} />
        </div>
      </div>

      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:gap-4">
        <div className="-mx-5 overflow-hidden px-5 pb-1 md:mx-0 md:px-0 2xl:w-64 2xl:shrink-0 2xl:pb-0">
          <h2 className="hidden px-1.5 pb-2 font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink 2xl:flex 2xl:items-baseline 2xl:gap-1.5">
            Unscheduled
          </h2>
          <div className="flex w-max items-start gap-2 2xl:w-auto 2xl:flex-col 2xl:items-stretch">
            <section className="flex shrink-0 flex-col rounded-xl bg-surface p-1.5">
              <h3 className="flex h-7 items-center gap-1.5 px-1.5 pb-1 text-[13px] font-semibold text-ink">
                No date
              </h3>
              <div className="flex items-start gap-1.5 2xl:flex-col 2xl:items-stretch">
                <div className="w-60 shrink-0 rounded-lg bg-surface-raised py-2 pr-2 pl-2.5 2xl:w-auto">
                  <div className="flex items-start gap-2">
                    <span className="mt-px size-[18px] shrink-0 rounded-full border-[1.5px] border-line-strong" />
                    <SkeletonLine className="h-5 min-w-0 flex-1" bar="h-3 w-32" />
                  </div>
                  <SkeletonLine className="mt-1 h-[18px] pl-[26px]" bar="h-2.5 w-20" />
                </div>
                <div className="w-48 shrink-0 2xl:w-auto">
                  <AddTask />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="overflow-hidden sm:-mx-5 sm:px-5 sm:pb-1 md:mx-0 md:px-0 2xl:min-w-0 2xl:flex-1">
          <div className="grid gap-2 sm:auto-cols-[minmax(7.75rem,1fr)] sm:grid-flow-col">
            {weekDays(start).map((day) => {
              const past = day < today;
              const isToday = day === today;
              return (
                <section
                  key={day}
                  className={cn(
                    "flex flex-col rounded-xl p-1.5 sm:min-h-[max(18rem,calc(100dvh-28rem))] 2xl:min-h-[max(18rem,calc(100dvh-19rem))]",
                    isToday ? "bg-accent-soft/50" : past ? "bg-surface/50" : "bg-surface",
                    past && "max-sm:hidden",
                  )}
                >
                  <header className="flex h-9 items-center gap-1.5 px-1.5 pb-1">
                    <span
                      className={cn(
                        "text-[11.5px] font-semibold tracking-[0.06em] uppercase",
                        isToday ? "text-accent-ink" : past ? "text-ink-faint" : "text-ink-subtle",
                      )}
                    >
                      {dayName(day)}
                    </span>
                    <span
                      className={cn(
                        "font-heading font-semibold tabular-nums",
                        isToday
                          ? "flex size-6 items-center justify-center rounded-full bg-accent text-[13px] text-accent-contrast"
                          : cn("text-[15px]", past ? "text-ink-faint" : "text-ink"),
                      )}
                    >
                      {dayNumber(day)}
                    </span>
                  </header>
                  {day >= today && (
                    <div className="mt-auto pt-1.5">
                      <AddTask />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTask() {
  return (
    <span className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-faint">
      <Plus className="size-3.5" />
      Add task
    </span>
  );
}
