"use client";

import { ChevronRight, Ellipsis, Plus, Smile } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { RoomHeader } from "@/components/shell/room-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonLine, SkeletonText } from "@/components/ui/skeleton";

import type { PageItem } from "../schema";
import { ancestorsOf, displayTitle } from "../tree";
import { EditedAt } from "./edited-at";
import { useNotes } from "./notes-provider";
import { PageIcon } from "./page-tree";

const RECENT = 9;
const EXCERPT = ["w-full", "w-11/12", "w-3/5"];
const BODY = ["w-full", "w-11/12", "w-full", "w-2/3", "w-0", "w-full", "w-4/5"];

/**
 * The Notes overview. Given the tree's pages (loaded above this boundary), the cards are
 * the real recent pages and only their excerpts wait; without them, all placeholder.
 */
export function OverviewSkeleton({ pages }: { pages?: PageItem[] }) {
  const recent = pages
    ? [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, RECENT)
    : null;
  return (
    <>
      <RoomHeader
        roomId="notes"
        actions={
          <span className={buttonVariants({ size: "sm" })}>
            <Plus />
            New page
          </span>
        }
      />
      {recent?.length !== 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
            Recently edited
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(recent ?? [null, null, null]).map((page, i) => (
              <li
                key={page?.id ?? i}
                className="flex h-full min-h-36 flex-col rounded-lg bg-surface p-4"
              >
                {page ? (
                  <PageIcon icon={page.icon} className="size-5 text-[20px]" />
                ) : (
                  <Skeleton className="size-5" />
                )}
                <p className="mt-3 line-clamp-2 font-heading text-[16px] font-semibold tracking-[-0.01em] text-ink">
                  {page ? displayTitle(page.title) : <SkeletonText className="h-3.5 w-2/3" />}
                </p>
                <div className="mt-1 flex-1 text-[13.5px] leading-relaxed">
                  {EXCERPT.map((w) => (
                    <SkeletonLine key={w} className="h-[1lh]" bar={`h-3 ${w}`} />
                  ))}
                </div>
                <p className="mt-3 h-4 text-[12px] text-ink-subtle">
                  {page && <EditedAt iso={page.updatedAt} prefix="" />}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** The overview inside the tree layout, where the pages are already known. */
export function TreeOverviewSkeleton() {
  return <OverviewSkeleton pages={useNotes().pages} />;
}

/**
 * One page while its document loads. The tree already holds its title, icon and place, so
 * the header is the real one; only the body waits.
 */
export function PageSkeleton() {
  const { pages, currentId } = useNotes();
  const page = pages.find((p) => p.id === currentId);
  return <PageOutline page={page} ancestors={page ? ancestorsOf(pages, page.id) : []} />;
}

/** Entering Notes from another room: no tree yet, so the URL picks the shape. */
export function NotesRoomSkeleton() {
  return /^\/notes\/./.test(usePathname()) ? <PageOutline ancestors={[]} /> : <OverviewSkeleton />;
}

function PageOutline({ page, ancestors }: { page?: PageItem; ancestors: PageItem[] }) {
  return (
    <article className="mx-auto w-full max-w-[44rem]">
      <div className="flex h-9 items-center justify-between gap-3">
        <ol className="flex min-w-0 items-center gap-0.5 text-[13px] text-ink-subtle">
          <li className="shrink-0">
            <Link
              href="/notes"
              className="rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover/70 hover:text-ink"
            >
              Notes
            </Link>
          </li>
          {ancestors.map((a) => (
            <li key={a.id} className="flex min-w-0 items-center gap-0.5">
              <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
              <Link
                href={`/notes/${a.id}` as Route}
                className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover/70 hover:text-ink"
              >
                <PageIcon icon={a.icon} className="size-3.5 text-[12px]" />
                <span className="truncate">{displayTitle(a.title)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex shrink-0 items-center gap-1">
          <span className="flex size-8 items-center justify-center text-ink-subtle">
            <Ellipsis className="size-4" />
          </span>
        </div>
      </div>

      <header className="pt-10 pb-3 md:pt-14">
        {page?.icon ? (
          <span className="mb-3 -ml-1.5 flex size-[4.5rem] items-center justify-center text-[3.25rem] leading-none">
            {page.icon}
          </span>
        ) : (
          <span className="invisible mb-1 -ml-2 flex h-8 items-center gap-1.5 px-2 text-[13px]">
            <Smile className="size-4" />
            Add icon
          </span>
        )}
        <h1 className="font-heading text-[2.5rem] leading-[1.15] font-semibold tracking-[-0.03em] break-words text-ink md:text-[2.75rem]">
          {page ? (
            page.title || <span className="text-ink-faint">Untitled</span>
          ) : (
            <SkeletonText className="h-8 w-2/3" />
          )}
        </h1>
        <p className="mt-3 flex h-5 items-center gap-2 text-[12.5px] text-ink-subtle">
          {page && <EditedAt iso={page.updatedAt} />}
        </p>
      </header>

      <div aria-hidden className="text-[16.5px] leading-[1.7]">
        {BODY.map((w, i) => (
          <SkeletonLine
            key={i}
            className="mt-[0.15rem] h-[1lh] py-0.5 first:mt-0"
            bar={`h-3.5 ${w}`}
          />
        ))}
      </div>
    </article>
  );
}

/** The right-rail tree before the pages arrive (entering Notes from another room). */
export function TreeSkeleton() {
  return (
    <div className="pt-0.5">
      <div className="mb-1.5 flex items-center justify-between pr-1 pl-2.5">
        <p className="text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">Pages</p>
        <span className="flex size-7 items-center justify-center text-ink-subtle">
          <Plus className="size-4" />
        </span>
      </div>
      <div aria-hidden className="flex flex-col gap-px">
        {["w-3/5", "w-4/5"].map((w) => (
          <div key={w} className="flex h-8 items-center gap-2 pr-1 pl-[26px]">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className={`h-3 ${w}`} />
          </div>
        ))}
      </div>
      <span className="mt-1 flex h-8 w-full items-center gap-2 pl-[9px] text-[13px] text-ink-subtle">
        <Plus className="size-4" />
        New page
      </span>
    </div>
  );
}
