import Link from "next/link";

import { OrbitRing } from "@/features/orbit/components/orbit-ring";
import { describeTarget, HEALTH_META, healthOf, progressOf } from "@/features/orbit/board";
import type { OrbitSummary } from "@/features/orbit/schema";
import { colorOf } from "@/features/tasks";
import type { IsoDate } from "@/lib/dates";

import { RoomCard } from "./room-cards";

const RANK = { late: 0, "at-risk": 1, "on-track": 2 } as const;

/** Projects in flight, the ones needing attention first. */
export function ProjectsCard({ projects, today }: { projects: OrbitSummary[]; today: IsoDate }) {
  const inFlight = projects
    .map((p) => ({ ...p, health: healthOf(p, today) }))
    .filter((p) => p.health !== null)
    .sort(
      (a, b) =>
        RANK[a.health!] - RANK[b.health!] ||
        (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"),
    )
    .slice(0, 3);

  return (
    <RoomCard
      title="Projects"
      href="/orbit"
      linkLabel="Orbit"
      empty={
        inFlight.length
          ? null
          : "No projects in orbit. Set a project to In orbit and its progress shows here."
      }
    >
      {inFlight.map((p) => {
        const progress = progressOf(p.open, p.done);
        const health = HEALTH_META[p.health!];
        return (
          <li key={p.id}>
            <Link
              href={`/orbit/${p.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
            >
              <OrbitRing
                progress={progress}
                size={32}
                stroke={3}
                tone={colorOf(p.color).text}
                label={`${Math.round(progress * 100)}% done`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                  {p.icon && <span aria-hidden>{p.icon}</span>}
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="block h-4 truncate text-[12px] text-ink-subtle">
                  {p.health === "on-track" ? (
                    p.targetDate ? (
                      describeTarget(p.targetDate, today)
                    ) : (
                      `${p.open} open`
                    )
                  ) : (
                    <span className={health.text}>
                      {p.health === "late" && p.targetDate
                        ? describeTarget(p.targetDate, today)
                        : p.overdue > 0
                          ? `${p.overdue} overdue`
                          : health.label}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </RoomCard>
  );
}
