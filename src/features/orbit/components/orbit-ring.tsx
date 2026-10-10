import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Progress as an orbit: the arc is the path travelled, the planet sits at its tip.
 * Both sweep in with CSS on first paint (no JavaScript needed).
 */
export function OrbitRing({
  progress,
  size = 64,
  stroke = 4,
  tone,
  label,
  children,
  className,
}: {
  /** 0 … 1 */
  progress: number;
  size?: number;
  stroke?: number;
  /** A text-* class: the arc and planet use currentColor. */
  tone: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const planet = stroke * 1.35;
  const r = (size - planet * 2) / 2;
  const c = size / 2;
  const length = 2 * Math.PI * r;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", tone, className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-sunken"
        />
        {p > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - p)}
            className="animate-orbit-draw"
            style={{ "--orbit-length": `${length}px` } as CSSProperties}
          />
        )}
        <g
          className="animate-orbit-sweep"
          style={{ transform: `rotate(${p * 360}deg)`, transformOrigin: "50% 50%" }}
        >
          <circle cx={c + r} cy={c} r={planet} className="fill-surface-raised" />
          <circle cx={c + r} cy={c} r={planet - 1.5} fill="currentColor" />
        </g>
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
