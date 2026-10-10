"use client";

import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

import { isBreak, isIdle, isRunning, phaseLabel } from "../timer";
import { ProgressRing } from "./progress-ring";
import { useTimer, useTimerClock } from "./timer-provider";

/**
 * The running timer, everywhere but the Time room: in the sidebar (with pause/resume)
 * and the mobile header (compact, a link to Time). Hidden while idle.
 */
export function TimerPill({ compact = false }: { compact?: boolean }) {
  const { timer, send } = useTimer();
  const { clock, progress } = useTimerClock();
  const pathname = usePathname();
  const visible = !(isIdle(timer) && !isBreak(timer)) && !pathname.startsWith("/time");
  const running = isRunning(timer);
  const onBreak = isBreak(timer);
  const label =
    timer.task?.title ?? (timer.mode === "stopwatch" ? "Stopwatch" : phaseLabel[timer.phase]);
  const tone = onBreak ? "text-accent" : "text-room-time";

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.15 } }}
          transition={spring.snappy}
          className={cn(
            "flex items-center rounded-lg bg-surface-raised",
            compact ? "h-9 px-2.5" : "gap-1 p-1.5 pl-2",
          )}
        >
          <Link
            href="/time"
            title={`${phaseLabel[timer.phase]}${running ? "" : " (paused)"} — open Time`}
            className={cn(
              "flex min-w-0 flex-1 items-center rounded-md py-0.5",
              compact ? "gap-2" : "gap-2.5",
            )}
          >
            <ProgressRing
              progress={progress}
              size={compact ? 18 : 24}
              stroke={compact ? 2.5 : 3}
              className={tone}
            />
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "font-heading leading-tight font-semibold text-ink tabular-nums",
                  compact ? "text-[13.5px]" : "text-[15px]",
                  !running && "text-ink-muted",
                )}
              >
                {clock}
              </span>
              {!compact && (
                <span className="truncate text-[11.5px] text-ink-subtle">
                  {running ? label : `Paused · ${label}`}
                </span>
              )}
            </span>
          </Link>
          {!compact && (
            <button
              type="button"
              onClick={() => void send({ type: running ? "pause" : "start" })}
              aria-label={running ? "Pause timer" : "Resume timer"}
              title={running ? "Pause" : "Resume"}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-[background-color,color,transform] hover:bg-surface-hover hover:text-ink active:scale-90 [&_svg]:size-[15px]"
            >
              {running ? <Pause /> : <Play />}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
