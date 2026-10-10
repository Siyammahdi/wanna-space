import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Rendered on the label row's right side, e.g. a "Forgot?" link. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + one line of hint or error. The control must use the same `id`. */
export function Field({ id, label, error, hint, aside, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-muted">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
