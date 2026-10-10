"use client";

import { CalendarClock, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  colorOf,
  createProject,
  nextProjectColor,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/features/tasks";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { spring } from "@/lib/motion";

import { describeTarget, HEALTH_META, healthOf, progressOf, STATUS_META } from "../board";
import type { OrbitSummary } from "../schema";
import { OrbitRing } from "./orbit-ring";
import { StageBar } from "./stage-bar";

type Filter = "all" | ProjectStatus;

export function OrbitOverview({ projects, today }: { projects: OrbitSummary[]; today: IsoDate }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(projects.length === 0);
  const counts = new Map<Filter, number>([["all", projects.length]]);
  for (const p of projects) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  const shown = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Filter by status"
          className="-mx-1 flex [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 py-0.5"
        >
          <Pill active={filter === "all"} count={projects.length} onSelect={() => setFilter("all")}>
            All
          </Pill>
          {PROJECT_STATUSES.filter((s) => counts.get(s)).map((s) => (
            <Pill
              key={s}
              active={filter === s}
              count={counts.get(s)!}
              onSelect={() => setFilter(s)}
              dot={STATUS_META[s].dot}
            >
              {STATUS_META[s].label}
            </Pill>
          ))}
        </nav>
        {!creating && (
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
            <Plus />
            New project
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {creating && (
          <NewProject
            count={projects.length}
            onCancel={projects.length > 0 ? () => setCreating(false) : undefined}
          />
        )}
        {shown.map((p) => (
          <ProjectCard key={p.id} project={p} today={today} />
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  count,
  dot,
  onSelect,
  children,
}: {
  active: boolean;
  count: number;
  dot?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-8 shrink-0 items-center rounded-full">
      {active && (
        <motion.span
          layoutId="orbit-filter-active"
          transition={spring.glide}
          className="absolute inset-0 rounded-full bg-surface-raised"
        />
      )}
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          "relative flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors",
          active ? "text-ink" : "text-ink-muted hover:bg-surface-hover/60 hover:text-ink",
        )}
      >
        {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
        {children}
        <span className="text-[11.5px] text-ink-faint tabular-nums">{count}</span>
      </button>
    </div>
  );
}

function ProjectCard({ project: p, today }: { project: OrbitSummary; today: IsoDate }) {
  const color = colorOf(p.color);
  const status = STATUS_META[p.status];
  const health = healthOf(p, today);
  const progress = progressOf(p.open, p.done);
  const percent = Math.round(progress * 100);

  return (
    <Link
      href={`/orbit/${p.id}`}
      className="group flex flex-col gap-4 rounded-xl bg-surface p-4 transition-[background-color,transform] duration-300 ease-spring hover:-translate-y-0.5 hover:bg-surface-hover/70 active:translate-y-0"
    >
      <div className="flex items-start gap-3.5">
        <OrbitRing
          progress={progress}
          size={56}
          stroke={3.5}
          tone={color.text}
          label={`${percent}% complete`}
        >
          {p.icon ? (
            <span className="text-[22px] leading-none">{p.icon}</span>
          ) : (
            <span className="text-[12px] font-semibold text-ink tabular-nums">{percent}%</span>
          )}
        </OrbitRing>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate font-heading text-[17px] font-semibold tracking-[-0.015em] text-ink">
            {p.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            <span
              className={cn(
                "inline-flex h-5 items-center gap-1.5 rounded-full px-2 font-medium",
                status.soft,
                status.text,
              )}
            >
              <span className={cn("size-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>
            {health && (
              <span className={cn("font-medium", HEALTH_META[health].text)}>
                {HEALTH_META[health].label}
              </span>
            )}
          </div>
        </div>
      </div>

      <p
        className={cn(
          "line-clamp-2 min-h-[2lh] text-[13px] leading-relaxed",
          p.description ? "text-ink-muted" : "text-ink-faint",
        )}
      >
        {p.description || "No brief yet. Open the board to write one."}
      </p>

      <div className="mt-auto flex flex-col gap-2.5">
        <StageBar stages={p.stages} done={p.done} tone={color.dot} />
        <div className="flex items-center justify-between gap-3 text-[12px] text-ink-subtle tabular-nums">
          <span>
            {p.open} open · {p.done} done
            {p.overdue > 0 && <span className="text-warning"> · {p.overdue} overdue</span>}
          </span>
          {p.targetDate && p.status !== "complete" && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                p.targetDate < today && p.open > 0 && "text-warning",
              )}
            >
              <CalendarClock className="size-3.5" />
              {describeTarget(p.targetDate, today)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function NewProject({ count, onCancel }: { count: number; onCancel?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    const id = uuidv7();
    setError(null);
    startTransition(async () => {
      const result = await createProject({ id, name: trimmed, color: nextProjectColor(count) });
      if (!result.ok) return setError(result.error);
      router.push(`/orbit/${id}`);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex min-h-56 flex-col justify-between gap-4 rounded-xl bg-room-orbit-soft/60 p-4"
    >
      <div>
        <h2 className="font-heading text-[17px] font-semibold tracking-[-0.015em] text-ink">
          {count === 0 ? "Launch your first project" : "New project"}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Any tasks can become a project: give it a name, then shape its stages on the board.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <input
          autoFocus={count > 0}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && onCancel) {
              e.stopPropagation();
              onCancel();
            }
          }}
          maxLength={80}
          aria-label="Project name"
          placeholder="Website relaunch"
          className="h-10 w-full rounded-md bg-surface-raised px-3 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
        />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-1.5">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="accent" size="sm" disabled={!name.trim() || pending}>
            {pending ? <Spinner /> : null}
            Create
          </Button>
        </div>
      </div>
    </form>
  );
}
