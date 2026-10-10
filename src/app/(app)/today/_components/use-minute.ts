"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};

const snapshot = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/** Minutes since local midnight, ticking twice a minute; null on the server. */
export function useMinute(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
