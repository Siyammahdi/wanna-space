import { cn } from "@/lib/cn";

/** A circular progress track; color comes from `className` (text-*). */
export function ProgressRing({
  progress,
  size,
  stroke,
  className,
  trackClassName = "text-surface-sunken",
  smooth = true,
}: {
  progress: number;
  size: number;
  stroke: number;
  className?: string;
  trackClassName?: string;
  /** Eases between ticks; off when jumping (reset, new phase). */
  smooth?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className={cn("stroke-current", trackClassName)}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
        className={cn(
          "stroke-current",
          smooth && "transition-[stroke-dashoffset] duration-300 ease-linear",
          className,
        )}
      />
    </svg>
  );
}
