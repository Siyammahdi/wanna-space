"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { displayTitle } from "../../tree";
import { useNotes } from "../notes-provider";
import { PageIcon } from "../page-tree";

export function PageLinkView({ node, selected }: ReactNodeViewProps) {
  const { pages } = useNotes();
  const id = node.attrs.id as string | null;
  const page = id ? pages.find((p) => p.id === id) : undefined;

  return (
    <NodeViewWrapper data-drag-handle="" className="my-1">
      {page ? (
        <Link
          href={`/notes/${page.id}` as Route}
          contentEditable={false}
          className={cn(
            "group/link flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[15.5px] text-ink transition-colors hover:bg-surface-hover/70",
            selected && "bg-accent-soft/60",
          )}
        >
          <PageIcon icon={page.icon} className="text-[16px]" />
          <span className="truncate font-medium underline decoration-ink-faint/60 underline-offset-[5px] group-hover/link:decoration-ink-subtle">
            {displayTitle(page.title)}
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover/link:opacity-100" />
        </Link>
      ) : (
        <span
          contentEditable={false}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[15px] text-ink-faint"
        >
          <PageIcon icon={null} />
          <span className="line-through">Deleted page</span>
        </span>
      )}
    </NodeViewWrapper>
  );
}
