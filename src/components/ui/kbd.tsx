import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs px-1",
        "bg-surface-hover font-mono text-[11px] font-medium text-ink-subtle",
        className,
      )}
      {...props}
    />
  );
}
