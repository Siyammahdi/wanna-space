import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** A placeholder bar. Reads on the canvas and on every surface tone, light and dark. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-hover/70", className)}
      {...props}
    />
  );
}

/**
 * A line of text: a bar centred in the line's real height (`className`, e.g. `h-6`),
 * so the placeholder keeps the text's rhythm. `bar` sizes the bar itself.
 */
export function SkeletonLine({ className, bar }: { className?: string; bar: string }) {
  return (
    <div aria-hidden className={cn("flex items-center", className)}>
      <Skeleton className={bar} />
    </div>
  );
}

/**
 * A word inside the real text element (same font classes), so the line box keeps the
 * element's own height. Size it with `h-*` / `w-*`.
 */
export function SkeletonText({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block animate-pulse rounded-md bg-surface-hover/70 align-middle",
        className,
      )}
    />
  );
}
