"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

function getSnapshot() {
  const now = new Date();
  const hour = now.getHours();
  const part =
    hour < 5
      ? "Still up"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `${part}|${date}`;
}

/** Rendered from the user's clock, so it is client-only; the server sends a neutral fallback. */
export function Greeting() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "Welcome back|");
  const [part, date] = snapshot.split("|");

  return (
    <div>
      <p className="mb-1 h-5 text-[13px] font-medium tracking-wide text-ink-subtle">{date}</p>
      <h1 className="font-display text-[40px] leading-tight font-light tracking-tight text-ink md:text-[46px]">
        {part}
        <span className="text-accent">.</span>
      </h1>
    </div>
  );
}
