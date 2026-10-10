"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = Omit<ComponentProps<"button">, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200",
        "disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-accent" : "bg-ink-faint/55 hover:bg-ink-faint/75",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full bg-surface-raised shadow-md transition-transform duration-300 ease-spring group-active:scale-90",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
