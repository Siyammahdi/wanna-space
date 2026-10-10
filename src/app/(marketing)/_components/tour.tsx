"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { getRoom } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { ease, spring } from "@/lib/motion";

import { Scene, type SceneId } from "./scenes";

const STEPS: { id: SceneId; verb: string; title: string; body: string; points: string[] }[] = [
  {
    id: "tasks",
    verb: "Capture",
    title: "Say it the way you think it.",
    body: "Type “Pay rent fri p1 twp” and it’s filed: due Friday, top priority, inside Techwitpro. Dates, times, repeats, priorities and project keywords are understood as you type.",
    points: ["Press C from anywhere", "Every project gets a short keyword"],
  },
  {
    id: "planner",
    verb: "Plan",
    title: "Give the week a shape.",
    body: "Drag tasks onto the days you’ll actually do them. Anything unplanned waits in a tray, not in a guilt pile.",
    points: ["Week board with drag and drop", "Overdue work waits in its own lane"],
  },
  {
    id: "orbit",
    verb: "Run",
    title: "See every project from orbit.",
    body: "Turn tasks into a project with stages you define. Move cards along and watch the ring close as work ships.",
    points: ["Stages you shape", "Progress you can see at a glance"],
  },
  {
    id: "time",
    verb: "Focus",
    title: "Focus, and keep the receipts.",
    body: "Start a timer on any task. Every session is logged, so your week shows where the hours really went.",
    points: ["Focus sessions with a soft chime", "A weekly report of every hour"],
  },
  {
    id: "notes",
    verb: "Write",
    title: "Think in pages.",
    body: "A block editor with slash commands, nested pages and links to the rest of your space. Calm enough for a journal, sharp enough for a spec.",
    points: ["Type / for any block", "Pages inside pages"],
  },
  {
    id: "vault",
    verb: "Keep",
    title: "Keep what inspires you.",
    body: "Links, palettes, snippets, images and files saved in one place, unfurled, tagged and searchable. Your own little library.",
    points: ["Paste or drop to save", "Collections and quick filters"],
  },
];

/** Scrollytelling: copy scrolls on the left while a pinned scene plays on the right. */
export function Tour() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLElement | null)[]>([]);

  const jump = (i: number) => {
    steps.current[i]?.scrollIntoView({ block: "center" });
  };

  return (
    <section
      id="tour"
      aria-labelledby="tour-title"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-2xl scroll-rise text-center">
        <p className="text-[12px] font-medium tracking-[0.12em] text-accent uppercase">
          How it works
        </p>
        <h2
          id="tour-title"
          className="mt-3 font-heading text-[34px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[52px]"
        >
          Six rooms. One rhythm.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">
          Capture it, plan it, do it, keep it. Each room does one job well, and they all share the
          same tasks, projects and time.
        </p>
      </div>

      <div className="mt-16 lg:mt-8 lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <ol className="flex flex-col gap-20 lg:gap-0">
          {STEPS.map((step, i) => (
            <Step
              key={step.id}
              index={i}
              step={step}
              active={active === i}
              onActive={setActive}
              ref={(el) => {
                steps.current[i] = el;
              }}
            />
          ))}
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-[calc(50dvh-14rem)] h-[28rem]">
            <div className="relative h-full rounded-[28px] bg-surface-sunken/70 p-3">
              <nav aria-label="Rooms in the tour" className="mb-3 flex gap-1 px-1">
                {STEPS.map((step, i) => {
                  const room = getRoom(step.id);
                  const Icon = room.icon;
                  const on = active === i;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => jump(i)}
                      aria-current={on ? "step" : undefined}
                      className={cn(
                        "relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
                        on ? "text-ink" : "text-ink-subtle hover:text-ink-muted",
                      )}
                    >
                      {on && (
                        <motion.span
                          layoutId="tour-pill"
                          transition={spring.glide}
                          className="absolute inset-0 rounded-full bg-surface-raised"
                        />
                      )}
                      <Icon className={cn("relative size-3.5", on && room.tone.text)} />
                      <span className="relative">{room.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="relative h-[calc(100%-2.75rem)]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={STEPS[active]!.id}
                    initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -16, scale: 0.98, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease: ease.out }}
                    className="absolute inset-0"
                  >
                    <Scene id={STEPS[active]!.id} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  index,
  step,
  active,
  onActive,
  ref,
}: {
  index: number;
  step: (typeof STEPS)[number];
  active: boolean;
  onActive: (index: number) => void;
  ref: React.RefCallback<HTMLElement>;
}) {
  const local = useRef<HTMLLIElement>(null);
  const centered = useInView(local, { margin: "-45% 0px -45% 0px" });
  const room = getRoom(step.id);
  const Icon = room.icon;

  useEffect(() => {
    if (centered) onActive(index);
  }, [centered, onActive, index]);

  return (
    <li
      ref={(el) => {
        local.current = el;
        ref(el);
      }}
      className="lg:flex lg:min-h-[78vh] lg:items-center"
    >
      <div className="scroll-rise lg:max-w-md">
        <div className={cn("transition-opacity duration-500", !active && "lg:opacity-40")}>
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <span
              className={cn("flex size-7 items-center justify-center rounded-lg", room.tone.soft)}
            >
              <Icon className={cn("size-3.5", room.tone.text)} strokeWidth={2} />
            </span>
            <span className={room.tone.text}>
              {String(index + 1).padStart(2, "0")} · {step.verb}
            </span>
            <span className="text-ink-subtle">in {room.label}</span>
          </p>
          <h3 className="mt-4 font-heading text-[28px] leading-[1.1] font-medium tracking-[-0.035em] md:text-[36px]">
            {step.title}
          </h3>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{step.body}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {step.points.map((p) => (
              <li
                key={p}
                className="rounded-full bg-surface-raised/80 px-3 py-1 text-[12.5px] text-ink-muted"
              >
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 lg:hidden">
            <Scene id={step.id} />
          </div>
        </div>
      </div>
    </li>
  );
}
