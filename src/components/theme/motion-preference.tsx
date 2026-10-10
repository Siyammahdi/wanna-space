"use client";

import { MotionConfig } from "motion/react";
import { useSyncExternalStore } from "react";

import { readDevicePrefs, subscribeDevicePrefs } from "@/lib/settings";

/** Applies the "Reduce motion" device setting to motion components (the OS setting always applies). */
export function MotionPreference({ children }: { children: React.ReactNode }) {
  const reduced = useSyncExternalStore(
    subscribeDevicePrefs,
    () => readDevicePrefs().reduceMotion,
    () => false,
  );
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}
