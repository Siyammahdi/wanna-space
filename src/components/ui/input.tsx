"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { cn } from "@/lib/cn";

export const inputClasses = cn(
  "h-11 w-full rounded-md bg-surface-sunken px-3.5 text-[15px] text-ink outline-none",
  "transition-[background-color,box-shadow] duration-200 ease-out",
  "placeholder:text-ink-faint hover:bg-surface-hover",
  "focus-visible:bg-surface-raised focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:outline-none",
  "aria-invalid:ring-2 aria-invalid:ring-danger/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(inputClasses, "pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-sm text-ink-subtle transition-colors hover:text-ink"
      >
        <Icon className="size-[17px]" />
      </button>
    </div>
  );
}
