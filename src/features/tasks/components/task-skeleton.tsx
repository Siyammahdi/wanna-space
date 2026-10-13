import { Plus } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/*
 * Loading stand-ins built from the real components' own classes (QuickAdd, TaskRow,
 * TaskBoard's sections), so nothing moves when the data arrives. Change them together.
 */

const TITLE_WIDTHS = ["w-56", "w-44", "w-64", "w-40", "w-52", "w-36"];

/** QuickAdd at rest: its chrome is static, only the list behind it waits. */
export function QuickAddSkeleton({
  placeholder = "Add a task",
  inlineChips = false,
}: {
  placeholder?: string;
  inlineChips?: boolean;
}) {
  return (
    <div aria-hidden>
      <div className="flex h-14 items-center gap-3 rounded-xl bg-surface-raised px-4">
        <span className="flex size-6 items-center justify-center rounded-full bg-room-tasks-soft text-room-tasks">
          <Plus className="size-4" strokeWidth={2.25} />
        </span>
        <span className="flex-1 truncate text-[15px] text-ink-faint">{placeholder}</span>
        <Kbd data-kbd-hints className="hidden sm:inline-flex">
          C
        </Kbd>
      </div>
      {!inlineChips && <div className="h-8" />}
    </div>
  );
}

/** TaskRow's geometry: 48px, or 64px with a meta line under the title. */
export function TaskRowsSkeleton({
  rows,
  meta = true,
  offset = 0,
}: {
  rows: number;
  meta?: boolean | ((i: number) => boolean);
  offset?: number;
}) {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => {
        const hasMeta = typeof meta === "function" ? meta(i) : meta;
        return (
          <li key={i} className="flex items-start gap-3 rounded-lg py-2 pr-2 pl-3">
            <span className="mt-[5px] size-[18px] shrink-0 rounded-full border-[1.5px] border-line-strong" />
            <div className="min-w-0 flex-1 py-0.5">
              <SkeletonLine
                className="h-6"
                bar={cn("h-3", TITLE_WIDTHS[(i + offset) % TITLE_WIDTHS.length])}
              />
              {hasMeta && (
                <div className="mt-0.5 flex h-[18px] items-center gap-3">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-2.5 w-9" />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A section heading (Overdue, Today …) followed by its rows. */
export function TaskSectionSkeleton({
  rows,
  meta,
  offset,
}: {
  rows: number;
  meta?: boolean | ((i: number) => boolean);
  offset?: number;
}) {
  return (
    <section aria-hidden>
      <SkeletonLine className="mb-1 h-[23px] px-3" bar="h-3.5 w-20" />
      <TaskRowsSkeleton rows={rows} meta={meta} offset={offset} />
    </section>
  );
}

/** TaskBoard: quick add, then grouped lists. */
export function TaskBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <QuickAddSkeleton />
      <div className="flex flex-col gap-7">
        <TaskSectionSkeleton rows={3} />
        <TaskSectionSkeleton rows={2} meta={(i) => i === 0} offset={3} />
      </div>
    </div>
  );
}
