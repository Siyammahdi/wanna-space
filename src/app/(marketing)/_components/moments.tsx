"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { TaskCheck, TaskTitle } from "@/features/tasks/components/task-check";
import { cn } from "@/lib/cn";
import { ease, spring } from "@/lib/motion";

const TODOS = ["Reply to the landlord", "Ship the landing page", "Call Mum"];

const KEYS: { keys: string[]; label: string }[] = [
  { keys: ["C"], label: "Capture a task" },
  { keys: ["⌘", "K"], label: "Search everything" },
  { keys: ["J", "K"], label: "Move through lists" },
  { keys: ["X"], label: "Complete" },
  { keys: ["⌘", "Z"], label: "Undo anything" },
];

/** Two small, real interactions: ticking tasks off, and the keyboard rhythm. */
export function Moments() {
  return (
    <section aria-labelledby="moments-title" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="max-w-2xl scroll-rise">
        <p className="text-[12px] font-medium tracking-[0.12em] text-accent uppercase">
          The small things
        </p>
        <h2
          id="moments-title"
          className="mt-3 font-heading text-[34px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[52px]"
        >
          Built for the hundred tiny moments in a day.
        </h2>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Checklist />
        <Keys />
      </div>
    </section>
  );
}

function Checklist() {
  const [done, setDone] = useState<boolean[]>([true, false, false]);
  const count = done.filter(Boolean).length;
  const all = count === TODOS.length;

  return (
    <div className="flex scroll-rise flex-col rounded-[28px] bg-surface-raised/85 p-7 md:p-9">
      <h3 className="font-heading text-[22px] font-semibold tracking-tight">
        Finishing feels good.
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        A soft spring, a little burst, a line drawn through. Never confetti, never a streak to
        protect.
      </p>

      <ul className="mt-7 flex flex-col gap-1">
        {TODOS.map((title, i) => (
          <li
            key={title}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover"
          >
            <TaskCheck
              checked={done[i]!}
              onCheckedChange={(v) => setDone((d) => d.map((x, j) => (j === i ? v : x)))}
              label={`Complete “${title}”`}
            />
            <span className="text-[15px]">
              <TaskTitle checked={done[i]!}>{title}</TaskTitle>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            className="h-full origin-left rounded-full bg-room-tasks"
            initial={false}
            animate={{ scaleX: count / TODOS.length }}
            transition={spring.gentle}
          />
        </div>
        <div className="relative mt-3 h-5 text-[13px] text-ink-subtle" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={all ? "all" : "some"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: ease.out }}
            >
              {all
                ? "All done. That’s the feeling."
                : `${count} of ${TODOS.length} done. Go on, tick one.`}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Keys() {
  return (
    <div className="flex scroll-rise flex-col rounded-[28px] bg-surface-raised/85 p-7 [--rise-from:10%] md:p-9">
      <h3 className="font-heading text-[22px] font-semibold tracking-tight">
        Fast with keys, easy with a mouse.
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        Every action has a shortcut and a button. Use whichever your hands are already on.
      </p>

      <ul className="mt-7 flex flex-col gap-2">
        {KEYS.map((row, i) => (
          <li key={row.label} className="flex items-center gap-4 rounded-xl px-3 py-2">
            <span className="flex w-24 gap-1.5">
              {row.keys.map((k) => (
                <kbd
                  key={k}
                  style={{ "--key-index": i, "--key-count": KEYS.length } as React.CSSProperties}
                  className={cn(
                    "flex h-9 min-w-9 key-press items-center justify-center rounded-[10px] bg-surface px-2.5 font-mono text-[14px] font-medium text-ink-muted",
                    "shadow-[0_2px_0_var(--line-strong)]",
                  )}
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span className="text-[15px] text-ink-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
