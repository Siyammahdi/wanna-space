import type { ReactNode } from "react";

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-heading text-[30px] leading-tight font-semibold tracking-[-0.035em] text-ink">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{subtitle}</p>}
    </div>
  );
}
