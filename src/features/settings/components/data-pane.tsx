"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import { getSpaceStats, type SpaceStats } from "../server/stats";
import { Group, PaneHeader, Row } from "./parts";

const hours = (seconds: number) => {
  const h = seconds / 3600;
  return h >= 10
    ? `${Math.round(h)} h`
    : h >= 1
      ? `${h.toFixed(1)} h`
      : `${Math.round(seconds / 60)} min`;
};

export function DataPane() {
  const [stats, setStats] = useState<SpaceStats | null>(null);

  useEffect(() => {
    let live = true;
    void getSpaceStats()
      .then((s) => {
        if (live) setStats(s);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const tiles: [label: string, value: string | undefined][] = [
    ["Projects", stats?.projects.toString()],
    ["Open tasks", stats?.openTasks.toString()],
    ["Done tasks", stats?.doneTasks.toString()],
    ["Pages", stats?.pages.toString()],
    ["Focus logged", stats ? hours(stats.focusSeconds) : undefined],
    ["Vault items", stats?.vaultItems.toString()],
  ];

  return (
    <>
      <PaneHeader title="Data" description="Your space is yours. Take a copy whenever you like." />

      <Group label="In your space">
        <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface px-4 py-3">
              <dt className="text-[12px] text-ink-subtle">{label}</dt>
              <dd className="mt-1 h-7 font-heading text-[22px] leading-7 font-semibold tracking-[-0.02em] text-ink tabular-nums">
                {value ?? (
                  <span className="inline-block h-5 w-10 animate-pulse rounded-md bg-surface-sunken align-middle" />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Group>

      <Group label="Export">
        <Row
          title="Download everything"
          description="Projects and their Orbit stages, tasks (with subtasks and completed work), pages, logged time and your Vault, as one JSON file. Uploaded files download from the Vault."
          control={
            <a
              href="/api/export"
              download
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Download /> Export
            </a>
          }
        />
      </Group>
    </>
  );
}
