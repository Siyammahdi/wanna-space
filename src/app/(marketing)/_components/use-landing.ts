"use client";

import {
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotionConfig,
  useScroll,
  useSpring,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * True when motion should hold still (OS setting or the in-app preference).
 * Always false while hydrating, so server and client markup agree.
 */
export function useStill() {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const reduced = useReducedMotionConfig();
  return hydrated && Boolean(reduced);
}

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

/**
 * Scroll progress (0–1) of `target` through the viewport, lightly sprung.
 * Holds at 1 (the finished state) when motion should be still.
 */
export function useScrollProgress(
  target: React.RefObject<HTMLElement | null>,
  offset: ScrollOffset,
): MotionValue<number> {
  const still = useStill();
  const { scrollYProgress } = useScroll({ target, offset });
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.0005 });
  const progress = useMotionValue(0);

  useMotionValueEvent(smooth, "change", (v) => {
    if (!still) progress.set(v);
  });
  useEffect(() => {
    progress.jump(still ? 1 : smooth.get());
  }, [still, smooth, progress]);

  return progress;
}

/**
 * Steps through a looping sequence while the element is on screen. `durations[i]`
 * is how long step `i` holds. Server render and reduced motion show the last step.
 */
export function useSequence<T extends HTMLElement = HTMLDivElement>(durations: readonly number[]) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const still = useStill();
  const last = durations.length - 1;
  const [step, setStep] = useState(last);

  useEffect(() => {
    if (still || !inView) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % durations.length), durations[step]);
    return () => window.clearTimeout(id);
  }, [step, still, inView, durations]);

  return { ref, step: still ? last : step, still };
}
