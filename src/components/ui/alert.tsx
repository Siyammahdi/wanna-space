import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const tones = {
  info: { icon: Info, className: "bg-surface-sunken text-ink-muted" },
  success: { icon: CircleCheck, className: "bg-success-soft text-success" },
  danger: { icon: CircleAlert, className: "bg-danger-soft text-danger" },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex animate-rise gap-2.5 rounded-md px-3.5 py-3 text-[13.5px] leading-snug",
        toneClass,
        className,
      )}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
