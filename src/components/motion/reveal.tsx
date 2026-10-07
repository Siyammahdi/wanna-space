import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type RevealProps = ComponentProps<"div"> & {
  /** Position in the entrance sequence; each step adds 70ms of delay. */
  order?: number;
};

/**
 * Entrance animation in pure CSS so content paints before hydration —
 * never gate first paint on JavaScript.
 */
export function Reveal({ order = 0, className, style, ...props }: RevealProps) {
  return (
    <div
      className={cn("animate-rise", className)}
      style={{ animationDelay: `${order * 70}ms`, ...style }}
      {...props}
    />
  );
}
