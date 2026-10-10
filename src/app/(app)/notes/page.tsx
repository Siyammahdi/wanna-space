import { FileText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { RoomHeader } from "@/components/shell/room-header";
import { Card } from "@/components/ui/card";
import { EditedAt } from "@/features/notes/components/edited-at";
import { NewPageButton } from "@/features/notes/components/new-page-button";
import { PageIcon, PageTree } from "@/features/notes/components/page-tree";
import { listRecentPages } from "@/features/notes/server/queries";
import { displayTitle } from "@/features/notes/tree";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const recent = await listRecentPages(9);

  return (
    <>
      <RoomHeader roomId="notes" actions={<NewPageButton size="sm" />} />

      {recent.length === 0 ? (
        <Reveal>
          <Card className="relative overflow-hidden p-10">
            <div
              aria-hidden
              className="absolute -top-24 -right-24 size-72 rounded-full bg-room-notes-soft opacity-60 blur-3xl"
            />
            <div className="relative max-w-md">
              <FileText className="mb-5 size-8 text-room-notes" strokeWidth={1.5} />
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink">
                A quiet place to think.
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                Pages hold writing, lists and checklists, and nest inside each other as deep as you
                need. Press <span className="font-medium text-ink">/</span> in a page for every kind
                of block.
              </p>
              <NewPageButton className="mt-6">Write your first page</NewPageButton>
            </div>
          </Card>
        </Reveal>
      ) : (
        <section aria-labelledby="recent-pages">
          <h2
            id="recent-pages"
            className="mb-3 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase"
          >
            Recently edited
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((page, i) => (
              <li key={page.id}>
                <Reveal order={Math.min(i, 6)} className="h-full">
                  <Link
                    href={`/notes/${page.id}` as Route}
                    className="group flex h-full min-h-36 flex-col rounded-lg bg-surface p-4 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-surface-raised active:translate-y-0"
                  >
                    <PageIcon icon={page.icon} className="size-5 text-[20px]" />
                    <p className="mt-3 line-clamp-2 font-heading text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {displayTitle(page.title)}
                    </p>
                    <p className="mt-1 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-ink-muted">
                      {page.excerpt || <span className="text-ink-faint">Empty page</span>}
                    </p>
                    <p className="mt-3 h-4 text-[12px] text-ink-subtle">
                      <EditedAt iso={page.updatedAt} prefix="" />
                    </p>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-10 md:hidden">
          <PageTree />
        </section>
      )}
    </>
  );
}
