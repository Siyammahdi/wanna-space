"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { CornerDownLeft, Hash, Orbit, Sparkles } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/cn";

import { AppWindow } from "./app-window";
import { useScrollProgress } from "./use-landing";

/** The product window lies back, then settles flat as you scroll into it. */
export function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref, ["start end", "center center"]);
  const rotateX = useTransform(progress, [0, 1], [22, 0]);
  const scale = useTransform(progress, [0, 1], [0.9, 1]);
  const y = useTransform(progress, [0, 1], [40, 0]);

  return (
    <div ref={ref} className="relative mx-auto mt-16 max-w-5xl md:mt-20">
      <div
        aria-hidden
        className="absolute inset-x-[8%] top-[12%] -z-10 h-3/4 rounded-full bg-mint/60 blur-[90px]"
      />
      <div className="animate-rise [perspective:1600px]" style={{ animationDelay: "320ms" }}>
        <motion.div
          style={{ rotateX, scale, y, transformOrigin: "50% 0%" }}
          className="will-change-transform"
        >
          <AppWindow />
        </motion.div>
      </div>

      <Floater
        progress={progress}
        depth={-90}
        delay={560}
        className="top-[14%] -left-6 lg:-left-16"
      >
        <span className="flex items-center gap-2 rounded-full bg-surface-raised py-2 pr-2 pl-3.5 text-[13px] shadow-lg">
          <span className="text-ink">
            Pay rent{" "}
            <span className="rounded bg-room-planner-soft px-1 text-room-planner">fri</span>{" "}
            <span className="rounded bg-accent-soft px-1 text-accent-ink">p1</span>{" "}
            <span className="rounded bg-room-orbit-soft px-1 text-room-orbit">twp</span>
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-ink text-canvas">
            <CornerDownLeft className="size-3" />
          </span>
        </span>
      </Floater>

      <Floater
        progress={progress}
        depth={-150}
        delay={680}
        className="top-[46%] -right-4 lg:-right-14"
      >
        <span className="flex items-center gap-3 rounded-2xl bg-surface-raised p-3 pr-4 shadow-lg">
          <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="14"
              className="fill-none stroke-room-orbit-soft"
              strokeWidth="4"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="36"
              strokeLinecap="round"
              className="fill-none stroke-room-orbit"
              strokeWidth="4"
            />
          </svg>
          <span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-room-orbit">
              <Orbit className="size-3" /> Launch plan
            </span>
            <span className="block font-heading text-[15px] font-semibold">64% there</span>
          </span>
        </span>
      </Floater>

      <Floater progress={progress} depth={-60} delay={800} className="-bottom-6 left-[12%]">
        <span className="flex items-center gap-2.5 rounded-2xl bg-surface-raised p-2.5 pr-4 shadow-lg">
          <span className="grid size-9 grid-cols-2 overflow-hidden rounded-lg">
            <span className="bg-fern" />
            <span className="bg-sage" />
            <span className="bg-mint" />
            <span className="bg-cream" />
          </span>
          <span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-room-vault">
              <Sparkles className="size-3" /> Saved to Vault
            </span>
            <span className="block text-[13px] text-ink">Frosted Fern palette</span>
          </span>
        </span>
      </Floater>

      <Floater progress={progress} depth={-120} delay={920} className="-top-5 right-[18%]">
        <span className="flex items-center gap-1.5 rounded-full bg-room-tasks-soft px-3 py-1.5 text-[12px] font-medium text-room-tasks shadow-md">
          <Hash className="size-3" />
          twp → Techwitpro
        </span>
      </Floater>
    </div>
  );
}

function Floater({
  progress,
  depth,
  delay,
  className,
  children,
}: {
  progress: MotionValue<number>;
  /** How far (px) it drifts against the scroll; deeper reads as closer. */
  depth: number;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  const y = useTransform(progress, [0, 1], [-depth, 0]);
  return (
    <motion.div
      aria-hidden
      style={{ y }}
      className={cn("absolute z-10 hidden md:block", className)}
    >
      <div className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
        <div className="animate-float" style={{ animationDelay: `${-delay * 3}ms` }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
