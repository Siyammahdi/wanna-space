import { cn } from "@/lib/cn";

/** Where a project's tasks are: one segment per stage (deepening tone), then Done. */
export function StageBar({
  stages,
  done,
  tone,
  className,
}: {
  stages: { id: string; name: string; count: number }[];
  done: number;
  /** A bg-* class for Done; stages use it at rising opacity. */
  tone: string;
  className?: string;
}) {
  const total = stages.reduce((n, s) => n + s.count, done);
  const summary = [...stages.map((s) => `${s.count} ${s.name}`), `${done} done`].join(", ");

  return (
    <div
      role="img"
      aria-label={total ? summary : "No tasks yet"}
      title={total ? summary : undefined}
      className={cn("flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      {total > 0 &&
        stages.map((s, i) =>
          s.count ? (
            <span
              key={s.id}
              className={cn("h-full rounded-full", tone)}
              style={{
                width: `${(s.count / total) * 100}%`,
                opacity: 0.22 + (0.45 * (i + 1)) / (stages.length + 1),
              }}
            />
          ) : null,
        )}
      {done > 0 && (
        <span
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${(done / total) * 100}%` }}
        />
      )}
    </div>
  );
}
