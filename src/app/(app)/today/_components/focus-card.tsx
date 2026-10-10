"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

import { useSettings } from "@/components/shell/settings-context";
import { Card } from "@/components/ui/card";
import { colorOf } from "@/features/tasks";
import { ProgressRing } from "@/features/time/components/progress-ring";
import { useTimer, useTimerClock } from "@/features/time/components/timer-provider";
import { daySpan, totalSeconds } from "@/features/time/report";
import type { TimeEntryItem } from "@/features/time/schema";
import { formatDuration, isBreak, isIdle, isRunning, phaseLabel } from "@/features/time/timer";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/dates";
import { spring } from "@/lib/motion";

import { useMinute } from "./use-minute";

/** The focus timer from Today: start it, see it run, and where today's sessions fell. */
export function FocusCard({ entries }: { entries: TimeEntryItem[] }) {
  const { timer, send } = useTimer();
  const { clock, progress } = useTimerClock();
  const { timeFormat, dailyFocusGoal: goal } = useSettings();
  const minute = useMinute();

  const active = !(isIdle(timer) && !isBreak(timer));
  const running = isRunning(timer);
  const onBreak = isBreak(timer);
  const total = totalSeconds(entries);
  const reached = goal ? Math.min(1, total / (goal * 60)) : 0;
  const label =
    timer.task?.title ?? (timer.mode === "stopwatch" ? "Stopwatch" : phaseLabel[timer.phase]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink">Focus</h2>
        <Link
          href="/time"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          Time <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {active ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={spring.gentle}
            className="flex items-center gap-3.5"
          >
            <ProgressRing
              progress={progress}
              size={56}
              stroke={4}
              className={onBreak ? "text-accent" : "text-room-time"}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-heading text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums",
                  running ? "text-ink" : "text-ink-muted",
                )}
              >
                {clock}
              </p>
              <p className="mt-1.5 truncate text-[12.5px] text-ink-subtle">
                {running ? label : `Paused · ${label}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void send({ type: running ? "pause" : "start" })}
              aria-label={running ? "Pause timer" : "Resume timer"}
              title={running ? "Pause" : "Resume"}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-room-time-soft text-room-time transition-transform active:scale-90 [&_svg]:size-4"
            >
              {running ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={spring.gentle}
            className="flex items-end justify-between gap-3"
          >
            <div>
              <p className="font-heading text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                {total ? formatDuration(total) : "0m"}
              </p>
              <p className="mt-1.5 text-[12.5px] text-ink-subtle">
                {entries.length === 0
                  ? "No focus yet today"
                  : entries.length === 1
                    ? "1 session today"
                    : `${entries.length} sessions today`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void send({ type: "start" })}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-room-time-soft px-3.5 text-[13px] font-medium text-room-time transition-transform active:scale-95"
            >
              <Play className="size-3.5" fill="currentColor" />
              {timer.mode === "stopwatch" ? "Start" : "Start focus"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              style={{ transform: `scaleX(${reached})` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-ink-subtle tabular-nums">
            {reached >= 1
              ? `Goal reached · ${formatDuration(goal * 60)}`
              : `${formatDuration(total)} of ${formatDuration(goal * 60)}`}
          </p>
        </div>
      )}

      <div>
        <div className="relative h-6 overflow-hidden rounded-sm bg-surface-sunken">
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
          {minute !== null && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-0.5 rounded-full bg-ink/60"
              style={{ left: `${(minute / 1440) * 100}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-faint tabular-nums">
          {[0, 12, 24].map((h) => (
            <span key={h}>{formatTime(`${h % 24}:00`, timeFormat)}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}
