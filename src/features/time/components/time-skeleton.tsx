"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { useSearchParams } from "next/navigation";

import { useSettings } from "@/components/shell/settings-context";
import { useViewer } from "@/components/shell/viewer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonLine, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/dates";
import { dayName, startOfWeek, weekDays, weekFromParam, weekLabel } from "@/lib/week";

import { FocusTimer } from "./focus-timer";

const HOURS = [0, 6, 12, 18, 24];

/** The Log time button as it renders before its task choices arrive. */
export function LogTimeSkeleton() {
  return (
    <span className={buttonVariants({ variant: "secondary", size: "sm" })}>
      <Plus /> Log time
    </span>
  );
}

/**
 * The Time room before its entries arrive. The timer lives in the app shell, so it is the
 * real, running one; the reports keep their real frames and only their numbers wait.
 */
export function TimeSkeleton() {
  const { timeFormat, dailyFocusGoal, weekStartsOn } = useSettings();
  const { today } = useViewer();
  const start = weekFromParam(useSearchParams().get("week") ?? undefined, today, weekStartsOn);
  const current = start === startOfWeek(today, weekStartsOn);
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:[grid-template-areas:'timer_today'_'timer_week'_'sessions_week']">
      <div className="md:[grid-area:timer]">
        <FocusTimer choices={[]} />
      </div>

      <div className="md:[grid-area:today]">
        <Card className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Today</h2>
              <p className="mt-1.5 font-heading text-[30px] leading-none font-semibold">
                <SkeletonText className="h-6 w-20" />
              </p>
            </div>
            <p className="pt-0.5 text-[12.5px]">
              <SkeletonText className="h-3 w-16" />
            </p>
          </div>
          {dailyFocusGoal > 0 && (
            <div>
              <div className="h-1.5 rounded-full bg-surface-sunken" />
              <p className="mt-1.5 text-[12px]">
                <SkeletonText className="h-2.5 w-40" />
              </p>
            </div>
          )}
          <div>
            <div className="h-7 rounded-sm bg-surface-sunken" />
            <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-faint tabular-nums">
              {HOURS.map((h) => (
                <span key={h}>{formatTime(`${h % 24}:00`, timeFormat)}</span>
              ))}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed">
            <SkeletonText className="h-3 w-3/4" />
          </p>
        </Card>
      </div>

      <div className="md:[grid-area:week]">
        <Card className="flex flex-col gap-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              {current ? "This week" : weekLabel(start)}
            </h2>
            <div className="-my-1 flex items-center gap-0.5 text-ink-muted">
              {!current && (
                <span className={buttonVariants({ variant: "ghost", size: "sm" })}>This week</span>
              )}
              <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <ChevronLeft />
              </span>
              <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <ChevronRight />
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {["Total", "Daily average", "Best day"].map((label) => (
              <div key={label} className="min-w-0 rounded-lg bg-surface-sunken/60 px-3 py-2.5">
                <dt className="truncate text-[11.5px] text-ink-subtle">{label}</dt>
                <dd className="mt-1 font-heading text-[19px] leading-none font-semibold">
                  <SkeletonText className="h-4 w-12" />
                </dd>
              </div>
            ))}
          </dl>
          <div aria-hidden className="grid h-40 grid-cols-7 gap-2">
            {weekDays(start).map((day) => (
              <div key={day} className="flex min-w-0 flex-col items-center gap-2">
                <div className="w-full flex-1 rounded-md bg-surface-sunken/45" />
                <span className="flex flex-col items-center leading-tight">
                  <span
                    className={cn(
                      "text-[12px] font-medium",
                      day === today ? "text-room-time" : "text-ink-muted",
                    )}
                  >
                    {dayName(day)}
                  </span>
                  <span className="text-[11px] text-ink-faint">·</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="md:[grid-area:sessions]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Sessions</h2>
          <div className="mt-2 text-[13px] leading-relaxed">
            <SkeletonLine className="h-[1lh]" bar="h-3 w-4/5" />
            <SkeletonLine className="h-[1lh]" bar="h-3 w-1/2" />
          </div>
        </Card>
      </div>
    </div>
  );
}
