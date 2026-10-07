import type { Transition, Variants } from "motion/react";

/**
 * Motion presets. Components should pick from these instead of inventing
 * one-off timings, so the whole product moves with one personality:
 * calm at rest, expressive on interaction.
 */
export const spring = {
  /** Hover/press feedback, toggles, checkboxes. */
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  /** Panels, sheets, layout shifts. */
  gentle: { type: "spring", stiffness: 260, damping: 30 },
  /** Moments of delight: completing a task, saving to the vault. */
  bouncy: { type: "spring", stiffness: 420, damping: 16, mass: 0.8 },
  /** Shared-layout highlights (active nav pill, tabs). */
  glide: { type: "spring", stiffness: 380, damping: 36 },
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/**
 * Rise in with a soft blur; pair with `stagger` on the parent. Only for content
 * that mounts after hydration — server-rendered entrances use <Reveal> (CSS).
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: ease.out },
  },
};

export const stagger = (step = 0.06, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren: delay } },
});
