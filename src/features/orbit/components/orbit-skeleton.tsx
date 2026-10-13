"use client";

import type { ReactNode } from "react";

import { useParams } from "next/navigation";
import { ChevronLeft, List, MoreHorizontal, Orbit, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { colorOf, useShellProjects } from "@/features/tasks";
import { cn } from "@/lib/cn";

import { OrbitRingSkeleton } from "./orbit-ring";

/**
 * OrbitOverview before its projects arrive: the real filter and button, and one card per
 * project the shell knows (name and color real, figures waiting).
 */
export function OverviewSkeleton() {
  const projects = useShellProjects();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex items-center gap-1 px-1 py-0.5">
          <span className="flex h-8 items-center gap-2 rounded-full bg-surface-raised px-3 text-[13px] font-medium text-ink">
            All
            <SkeletonText className="h-2.5 w-3" />
          </span>
        </div>
        {projects.length > 0 && (
          <span className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Plus />
            New project
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.length === 0 && <div className="min-h-56 rounded-xl bg-room-orbit-soft/60" />}
        {projects.map((p) => (
          <div key={p.id} className="flex flex-col gap-4 rounded-xl bg-surface p-4">
            <div className="flex items-start gap-3.5">
              <OrbitRingSkeleton size={56} stroke={3.5} />
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="truncate font-heading text-[17px] font-semibold tracking-[-0.015em] text-ink">
                  {p.name}
                </h2>
                <div className="mt-1.5 flex items-center text-[12px]">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <p className="min-h-[2lh] text-[13px] leading-relaxed">
              <SkeletonText className="h-3 w-4/5" />
            </p>
            <div className="mt-auto flex flex-col gap-2.5">
              <div className="h-1.5 rounded-full bg-surface-sunken" />
              <p className="text-[12px]">
                <SkeletonText className="h-2.5 w-24" />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * OrbitBoard before the project arrives: header and columns at their real sizes. The shell
 * knows the project's name and color, so those are real too.
 */
export function BoardSkeleton() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useShellProjects().find((p) => p.id === projectId);
  return (
    <div className="flex flex-col">
      <header className="@container mb-6">
        <span className="mb-3 -ml-1.5 inline-flex h-7 items-center gap-1 rounded-md pr-2 pl-1 text-[13px] font-medium text-ink-subtle">
          <ChevronLeft className="size-4" />
          <Orbit className="size-3.5 text-room-orbit" />
          Orbit
        </span>

        <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-start @3xl:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            {project ? (
              <span className={cn("size-12 shrink-0 rounded-xl", colorOf(project.color).soft)} />
            ) : (
              <Skeleton className="size-12 shrink-0 rounded-xl" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink">
                {project?.name ?? <SkeletonText className="h-6 w-56 max-w-full" />}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              {/* Inline-block with a bottom baseline, like the brief's textarea: same line box. */}
              <span className="mt-3 -ml-1.5 inline-block h-9 w-full max-w-2xl overflow-hidden px-1.5 py-3 align-baseline">
                <Skeleton className="h-3 w-72 max-w-full" />
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 @3xl:pt-6">
            <OrbitRingSkeleton size={72} stroke={4.5} />
            <div className="text-[13px] leading-snug">
              <p>
                <SkeletonText className="h-3 w-20" />
              </p>
              <p>
                <SkeletonText className="h-3 w-16" />
              </p>
            </div>
            <div className="flex items-center gap-1 text-ink-muted">
              <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <List />
              </span>
              <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <MoreHorizontal />
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="-mx-5 overflow-hidden px-5 pb-3 md:mx-0 md:px-0">
        <div className="flex items-start gap-2">
          {[2, 1, 0].map((cards, i) => (
            <Column key={i}>
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: cards }, (_, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-2 rounded-lg bg-surface-raised py-2.5 pr-2 pl-2.5"
                  >
                    <span className="mt-px size-[18px] shrink-0 rounded-full border-[1.5px] border-line-strong" />
                    <span className="flex h-5 min-w-0 flex-1 items-center">
                      <Skeleton className="h-3 w-3/4" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-1 pt-1.5">
                <span className="flex h-8 flex-1 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-faint">
                  <Plus className="size-3.5" />
                  Add task
                </span>
              </div>
            </Column>
          ))}
          <Column done />
          <span className="flex h-11 w-[12rem] shrink-0 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium text-ink-subtle">
            <Plus className="size-3.5" />
            Add stage
          </span>
        </div>
      </div>
    </div>
  );
}

function Column({ done = false, children }: { done?: boolean; children?: ReactNode }) {
  return (
    <section
      className={cn(
        "flex min-h-[26rem] w-[17.5rem] shrink-0 flex-col rounded-xl p-1.5 sm:w-auto sm:min-w-[15.5rem] sm:flex-1 sm:shrink",
        done ? "bg-success-soft/40" : "bg-surface",
      )}
    >
      <header className="flex h-9 items-center gap-1.5 pr-0.5 pl-1.5 text-[13px] font-semibold">
        {done ? <span className="text-success">Done</span> : <SkeletonText className="h-3 w-20" />}
      </header>
      {children}
    </section>
  );
}
