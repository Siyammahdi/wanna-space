import {
  ArrowRight,
  Code2,
  FileText,
  Image as ImageIcon,
  Link2,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EditedAt } from "@/features/notes/components/edited-at";
import type { RecentPage } from "@/features/notes/schema";
import { displayTitle } from "@/features/notes/tree";
import { VaultImage } from "@/features/vault/components/vault-image";
import { itemLabel } from "@/features/vault/filters";
import type { VaultItem, VaultKind } from "@/features/vault/schema";

const KIND_ICON: Record<VaultKind, LucideIcon> = {
  link: Link2,
  image: ImageIcon,
  file: FileText,
  snippet: Code2,
  note: StickyNote,
};

/** A bottom-row card: a title with a link to its room, then up to three rows. */
export function RoomCard({
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  title: string;
  href: Route;
  linkLabel: string;
  /** Shown instead of the rows when there are none. */
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          {linkLabel} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {empty ? (
        <p className="text-[13px] leading-relaxed text-ink-subtle">{empty}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">{children}</ul>
      )}
    </Card>
  );
}

function Row({
  href,
  tile,
  title,
  meta,
}: {
  href: Route;
  tile: React.ReactNode;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
      >
        <span className="size-8 shrink-0 overflow-hidden rounded-md">{tile}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink">{title}</span>
          <span className="block h-4 truncate text-[12px] text-ink-subtle">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

/** The pages you last touched. */
export function NotesCard({ pages }: { pages: RecentPage[] }) {
  return (
    <RoomCard
      title="Notes"
      href="/notes"
      linkLabel="All pages"
      empty={pages.length ? null : "No pages yet. Notes you write will be one click away here."}
    >
      {pages.map((p) => (
        <Row
          key={p.id}
          href={`/notes/${p.id}` as Route}
          title={displayTitle(p.title)}
          meta={<EditedAt iso={p.updatedAt} />}
          tile={
            <span className="flex size-full items-center justify-center bg-room-notes-soft text-[15px] text-room-notes">
              {p.icon ?? <FileText className="size-4" strokeWidth={1.75} />}
            </span>
          }
        />
      ))}
    </RoomCard>
  );
}

/** What you last saved to the Vault. */
export function VaultCard({ saves }: { saves: VaultItem[] }) {
  return (
    <RoomCard
      title="Vault"
      href="/vault"
      linkLabel="Open"
      empty={saves.length ? null : "Nothing saved yet. Links, images and snippets land here."}
    >
      {saves.map((item) => {
        const Icon = KIND_ICON[item.kind];
        const icon = (
          <span className="flex size-full items-center justify-center bg-room-vault-soft text-room-vault">
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        );
        return (
          <Row
            key={item.id}
            href="/vault"
            title={itemLabel(item)}
            meta={<EditedAt iso={item.createdAt} prefix="Saved" />}
            tile={
              item.preview ? (
                <VaultImage src={item.preview.thumb} fallback={icon} className="size-8" />
              ) : (
                icon
              )
            }
          />
        );
      })}
    </RoomCard>
  );
}
