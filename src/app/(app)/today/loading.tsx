import { ArrowRight, Sparkle } from "lucide-react";

import { RoomLoading } from "@/components/shell/room-loading";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonLine, SkeletonText } from "@/components/ui/skeleton";
import { OrbitRingSkeleton } from "@/features/orbit/components/orbit-ring";
import { QuickAddSkeleton, TaskRowsSkeleton } from "@/features/tasks/components/task-skeleton";

import { ViewerGreeting } from "./_components/greeting";

/** TodayBoard's own layout and fixed labels; only the day's data is placeholder. */
export default function TodayLoading() {
  return (
    <RoomLoading label="today" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1 basis-80">
          <ViewerGreeting />
          <div className="mt-3 flex h-8 max-w-xl items-center gap-2.5 py-1">
            <Sparkle aria-hidden className="size-4 shrink-0 text-accent" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <OrbitRingSkeleton size={64} stroke={5} />
          <div className="text-[13px] leading-snug">
            <p>
              <SkeletonText className="h-3 w-14" />
            </p>
            <p>
              <SkeletonText className="h-3 w-20" />
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 px-1">
          <h2 className="text-[13px] font-semibold text-ink">Today’s three</h2>
          <SkeletonLine className="mt-0.5 h-[19px]" bar="h-3 w-64" />
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className="flex min-h-28 flex-col rounded-xl bg-surface-sunken/35 px-4 py-4 max-sm:hidden max-sm:first:flex sm:min-h-32"
            >
              <span className="flex h-6 items-center font-heading text-[22px] leading-none font-semibold text-ink-faint/50 tabular-nums">
                {n}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <QuickAddSkeleton placeholder="Add a task for today…" inlineChips />
            <Card className="flex flex-1 flex-col gap-5 p-2 pb-3">
              <section>
                <SkeletonLine className="mb-1 min-h-8 px-3" bar="h-3 w-16" />
                <TaskRowsSkeleton rows={3} />
              </section>
              <section>
                <SkeletonLine className="mb-1 min-h-8 px-3" bar="h-3 w-12" />
                <TaskRowsSkeleton rows={2} meta={(i) => i === 0} offset={3} />
              </section>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="flex h-48 flex-col gap-4 p-5">
              <CardHeading title="Focus" link="Time" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="mt-auto h-6 w-full" />
            </Card>
            <Card className="flex flex-1 flex-col gap-3 p-5">
              <h2 className="text-[13px] font-semibold text-ink">Coming up</h2>
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </Card>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Projects", "Orbit"],
            ["Notes", "All pages"],
            ["Vault", "Open"],
          ].map(([title, link]) => (
            <Card key={title} className="flex flex-col gap-2 p-5">
              <div className="mb-1">
                <CardHeading title={title} link={link} />
              </div>
              <ul aria-hidden className="-mx-2 flex flex-col">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-2 py-1.5">
                    <Skeleton className="size-8 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <SkeletonLine className="h-5" bar="h-3 w-3/4" />
                      <SkeletonLine className="h-4" bar="h-2.5 w-1/3" />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </RoomLoading>
  );
}

/** A card's title and its room link: fixed text, shown as-is. */
function CardHeading({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-subtle">
        {link} <ArrowRight className="size-3.5" />
      </span>
    </div>
  );
}
