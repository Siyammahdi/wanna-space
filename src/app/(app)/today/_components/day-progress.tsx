import { OrbitRing } from "@/features/orbit/components/orbit-ring";

/** How much of today's list is done, as an orbit. */
export function DayProgress({ done, left }: { done: number; left: number }) {
  const total = done + left;
  const label =
    total === 0
      ? "Nothing due today"
      : `${done} of ${total} done today${left === 0 ? ", all clear" : ""}`;
  return (
    <div className="flex items-center gap-3.5">
      <OrbitRing
        progress={total ? done / total : 0}
        size={64}
        stroke={5}
        tone="text-room-tasks"
        label={label}
      >
        <span className="font-heading text-[15px] font-semibold text-ink tabular-nums">
          {total ? `${done}/${total}` : "—"}
        </span>
      </OrbitRing>
      <div className="text-[13px] leading-snug" aria-hidden>
        <p className="font-medium text-ink">
          {total === 0 ? "A clear day" : left === 0 ? "All clear" : `${left} to go`}
        </p>
        <p className="text-ink-subtle">{done === 1 ? "1 done today" : `${done} done today`}</p>
      </div>
    </div>
  );
}
