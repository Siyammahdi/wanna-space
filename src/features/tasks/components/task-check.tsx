"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

type TaskCheckProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
};

export function TaskCheck({ checked, onCheckedChange, label, className }: TaskCheckProps) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      whileTap={{ scale: 0.82, transition: spring.snappy }}
      animate={{ scale: checked ? [1, 1.18, 1] : 1 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200",
        checked ? "border-room-tasks" : "border-line-strong hover:border-ink-subtle",
        className,
      )}
    >
      <motion.span
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={spring.bouncy}
        className="absolute inset-[-1.5px] rounded-full bg-room-tasks"
      />
      <svg viewBox="0 0 16 16" className="relative size-3 text-white" aria-hidden>
        <motion.path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.28, delay: checked ? 0.08 : 0, ease: "easeOut" }}
        />
      </svg>
      <AnimatePresence>
        {checked && (
          <motion.span
            key="burst"
            initial={{ scale: 0.6, opacity: 0.55 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-room-tasks"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function TaskTitle({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span
        className={cn("transition-colors duration-300", checked ? "text-ink-subtle" : "text-ink")}
      >
        {children}
      </span>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: checked ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: checked ? 0.1 : 0 }}
        className="absolute top-1/2 left-0 h-px w-full origin-left bg-ink-subtle"
      />
    </span>
  );
}
