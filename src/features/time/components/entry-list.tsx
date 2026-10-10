"use client";

import { PenLine, Timer, Trash2, Watch } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { startTransition, useOptimistic } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { recordUndo } from "@/components/shell/undo";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { colorOf } from "@/features/tasks";
import { cn } from "@/lib/cn";
import { formatTime, type IsoDate } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { longDay } from "@/lib/week";

import { totalSeconds } from "../report";
import type { TimeEntryItem } from "../schema";
import { deleteEntry, restoreEntries } from "../server/actions";
import { formatDuration } from "../timer";

const sourceMeta = {
  pomodoro: { icon: Timer, label: "Pomodoro" },
  stopwatch: { icon: Watch, label: "Stopwatch" },
  manual: { icon: PenLine, label: "Added by hand" },
} as const;

/** The week's sessions, newest day first. */
export function EntryList({ entries, today }: { entries: TimeEntryItem[]; today: IsoDate }) {
  const { timeFormat } = useSettings();
  const [shown, hide] = useOptimistic(entries, (list, id: string) =>
    list.filter((e) => e.id !== id),
  );

  const remove = (entry: TimeEntryItem) => {
    startTransition(async () => {
      hide(entry.id);
      const result = await deleteEntry(entry.id);
      if (!result.ok) {
        toast({ message: result.error });
        return;
      }
      const label = entry.taskTitle ?? formatDuration(entry.seconds);
      recordUndo(
        {
          label,
          undo: () => void restoreEntries([result.entry]),
          redo: () => void deleteEntry(entry.id),
        },
        "Entry deleted",
      );
    });
  };

  const days = [...new Set(shown.map((e) => e.date))];

  if (days.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">Sessions</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-subtle">
          Nothing logged this week. Finished sessions, and time you add by hand, show up here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <h2 className="text-sm font-semibold text-ink">Sessions</h2>
      {days.map((day) => {
        const items = shown.filter((e) => e.date === day);
        return (
          <section key={day} aria-label={longDay(day)}>
            <header className="mb-1 flex items-baseline justify-between gap-3 px-2">
              <h3 className="text-[12.5px] font-medium text-ink-muted">
                {day === today ? "Today" : longDay(day)}
              </h3>
              <span className="text-[12px] text-ink-faint tabular-nums">
                {formatDuration(totalSeconds(items))}
              </span>
            </header>
            <ul>
              <AnimatePresence initial={false}>
                {items.map((e) => {
                  const Source = sourceMeta[e.source].icon;
                  return (
                    <motion.li
                      key={e.id}
                      layout="position"
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                      transition={spring.gentle}
                      className="group flex h-10 items-center gap-3 rounded-md px-2 text-[13px] transition-colors hover:bg-surface-hover/60"
                    >
                      <span className="w-[7.5rem] shrink-0 text-ink-subtle tabular-nums">
                        {formatTime(e.start, timeFormat)} – {formatTime(e.end, timeFormat)}
                      </span>
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          e.projectColor ? colorOf(e.projectColor).dot : "bg-ink-faint",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span
                          className={cn("truncate", e.taskTitle ? "text-ink" : "text-ink-subtle")}
                        >
                          {e.taskTitle ?? (e.note || "No task")}
                        </span>
                        {e.taskTitle && e.note && (
                          <span className="hidden truncate text-[12px] text-ink-faint sm:inline">
                            {e.note}
                          </span>
                        )}
                      </span>
                      <Source
                        aria-label={sourceMeta[e.source].label}
                        className="size-3.5 shrink-0 text-ink-faint"
                      />
                      <span className="w-14 shrink-0 text-right font-medium text-ink-muted tabular-nums">
                        {formatDuration(e.seconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(e)}
                        aria-label={`Delete ${formatDuration(e.seconds)} entry`}
                        title="Delete entry"
                        className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-faint opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </Card>
  );
}
