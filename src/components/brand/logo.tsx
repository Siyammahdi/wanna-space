import { cn } from "@/lib/cn";
import { site } from "@/config/site";

/** An open doorway with a warm light inside — "your space". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 text-ink", className)}>
      <path d="M5 29V14.5C5 8.15 9.92 3 16 3s11 5.15 11 11.5V29H5Z" fill="currentColor" />
      <path
        d="M10 29V15.5C10 11.91 12.69 9 16 9s6 2.91 6 6.5V29"
        fill="none"
        stroke="var(--canvas)"
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="18" r="3.25" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-medium tracking-tight text-ink">
        {site.name}
      </span>
    </span>
  );
}
