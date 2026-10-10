"use client";

import { useSyncExternalStore } from "react";

const subscribeMinute = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "Mar 3". Client-only, so it never disagrees with the server clock. */
export function EditedAt({ iso, prefix = "Edited" }: { iso: string; prefix?: string }) {
  const now = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  if (now === null) return null;
  const date = new Date(iso);
  const minutes = now - Math.floor(date.getTime() / 60_000);
  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = relative.format(-minutes, "minute");
  else if (minutes < 60 * 24) label = relative.format(-Math.floor(minutes / 60), "hour");
  else if (minutes < 60 * 24 * 7) label = relative.format(-Math.floor(minutes / 1440), "day");
  else
    label = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  return (
    <time dateTime={iso} title={date.toLocaleString()}>
      {prefix ? `${prefix} ${label}` : label}
    </time>
  );
}
