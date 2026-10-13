"use client";

import { Code2, Layers, Link2, Plus, Search, StickyNote, Upload } from "lucide-react";

import { useCapabilities } from "@/components/shell/capabilities";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/**
 * Visible from the board's own column breakpoints (`columnsFor`: 2 from 330px, then one more
 * per 248px card + 16px gap), as container queries so the count matches before any JS.
 */
const COLUMNS = [
  { show: "flex", cards: ["h-40", "h-64", "h-32"] },
  { show: "hidden @[330px]:flex", cards: ["h-56", "h-36", "h-48"] },
  { show: "hidden @[776px]:flex", cards: ["h-32", "h-60", "h-40"] },
  { show: "hidden @[1040px]:flex", cards: ["h-48", "h-36", "h-56"] },
  { show: "hidden @[1304px]:flex", cards: ["h-36", "h-52", "h-32"] },
  { show: "hidden @[1568px]:flex", cards: ["h-60", "h-32", "h-44"] },
];

/** The Vault before its items arrive: the real save bar, toolbar chrome and board columns. */
export function VaultSkeleton() {
  const { uploads } = useCapabilities();
  return (
    <>
      <div className="rounded-xl bg-surface-raised">
        <div className="flex h-14 items-center gap-3 pr-2 pl-4">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-room-vault-soft text-room-vault">
            <Link2 className="size-3.5" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] text-ink-faint">
            Paste a link, or jot something down…
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <ComposerButton icon={StickyNote} label="Note" />
            <ComposerButton icon={Code2} label="Snippet" />
            {uploads && <ComposerButton icon={Upload} label="Upload" />}
          </div>
        </div>
      </div>

      <div className="mt-5 mb-6 flex flex-col gap-3">
        <div className="-mx-1 flex items-center gap-1 overflow-hidden px-1 py-0.5">
          <span className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-surface-raised px-3 text-[13px] font-medium text-ink [&_svg]:size-3.5">
            <Layers />
            All
            <SkeletonText className="h-2.5 w-4" />
          </span>
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-subtle">
            <Plus className="size-3.5" />
            New collection
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="-mx-1 flex min-w-0 items-center gap-1 px-1">
            {["w-20", "w-24", "w-16"].map((w) => (
              <Skeleton key={w} className={cn("h-7", w)} />
            ))}
          </div>
          <span className="relative ml-auto flex h-9 w-full items-center gap-2 rounded-md bg-surface-sunken/70 px-3 sm:w-64">
            <Search className="size-4 shrink-0 text-ink-subtle" strokeWidth={2} />
            <span className="min-w-0 flex-1 text-[13.5px] text-ink-faint">Search the Vault</span>
            <Kbd data-kbd-hints className="hidden sm:inline-flex">
              /
            </Kbd>
          </span>
        </div>
      </div>

      <div aria-hidden className="@container pb-4">
        <div className="flex items-start gap-4">
          {COLUMNS.map((column, i) => (
            <div key={i} className={cn("min-w-0 flex-1 flex-col gap-4", column.show)}>
              {column.cards.map((h, j) => (
                <Skeleton key={j} className={cn("rounded-xl bg-surface-raised", h)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ComposerButton({ icon: Icon, label }: { icon: typeof Upload; label: string }) {
  return (
    <span className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-muted max-sm:w-9 max-sm:justify-center max-sm:px-0">
      <Icon className="size-4" strokeWidth={1.9} />
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}
