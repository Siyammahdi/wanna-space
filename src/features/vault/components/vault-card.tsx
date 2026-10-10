"use client";

import { Copy, Download, ExternalLink, FileText, Link2, MoreHorizontal, Play } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

import { formatBytes, itemLabel, previewRatio } from "../filters";
import { languageName } from "../language";
import type { VaultItem } from "../schema";
import { copyText, downloadHref, ItemMenu } from "./item-menu";
import { Favicon, VaultImage } from "./vault-image";
import type { PendingItem } from "./vault-provider";

const actionClass =
  "flex size-7 items-center justify-center rounded-md bg-canvas/85 text-ink-muted shadow-md backdrop-blur-sm transition-[color,background-color,transform] hover:bg-canvas hover:text-ink active:scale-90 [&_svg]:size-3.5";

export function VaultCard({ item, onOpen }: { item: VaultItem; onOpen: () => void }) {
  const [menu, setMenu] = useState(false);
  const title = itemLabel(item);

  const quick =
    item.kind === "link" && item.url ? (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${item.domain ?? "site"} in a new tab`}
        title="Open site"
        className={actionClass}
      >
        <ExternalLink />
      </a>
    ) : item.kind === "snippet" ? (
      <button
        type="button"
        aria-label="Copy code"
        title="Copy code"
        onClick={() => void copyText(item.body, "Code")}
        className={actionClass}
      >
        <Copy />
      </button>
    ) : item.file ? (
      <a
        href={downloadHref(item)}
        aria-label={`Download ${item.file.name}`}
        title="Download"
        className={actionClass}
      >
        <Download />
      </a>
    ) : null;

  return (
    <article
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu(true);
      }}
      className={cn(
        "group/card relative rounded-xl bg-surface-raised transition-[transform,box-shadow] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lg has-[[data-card]:focus-visible]:-translate-y-0.5 has-[[data-card]:focus-visible]:shadow-lg",
        menu && "z-20 -translate-y-0.5 shadow-lg",
      )}
    >
      <button
        type="button"
        data-card={item.id}
        aria-label={title}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            setMenu(true);
          }
        }}
        className="absolute inset-0 z-[1] rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      />
      <div className="relative overflow-hidden rounded-xl">
        <CardBody item={item} title={title} />
      </div>
      <div
        className={cn(
          "absolute top-2 right-2 z-[2] flex gap-1 transition-opacity duration-150",
          menu
            ? "opacity-100"
            : "opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <span className="[@media(hover:none)]:hidden">{quick}</span>
        <ItemMenu
          item={item}
          open={menu}
          onOpenChange={setMenu}
          onOpenDetail={onOpen}
          trigger={
            <button
              type="button"
              aria-label={`${title} options`}
              aria-haspopup="dialog"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
              className={actionClass}
            >
              <MoreHorizontal />
            </button>
          }
        />
      </div>
    </article>
  );
}

function Tags({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <p className={cn("flex flex-wrap gap-x-2 gap-y-0.5 text-[11.5px] text-ink-subtle", className)}>
      {tags.slice(0, 4).map((t) => (
        <span key={t}>#{t}</span>
      ))}
      {tags.length > 4 && <span className="text-ink-faint">+{tags.length - 4}</span>}
    </p>
  );
}

function CardBody({ item, title }: { item: VaultItem; title: string }) {
  switch (item.kind) {
    case "link":
      return (
        <>
          {item.preview && <VaultImage src={item.preview.thumb} ratio={previewRatio(item)} />}
          <div className="p-3.5">
            <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-subtle">
              <Favicon src={item.iconUrl} />
              <span className="truncate">{item.siteName ?? item.domain}</span>
            </p>
            <h3 className="mt-1.5 line-clamp-2 text-[14px] leading-snug font-medium text-ink">
              {title}
            </h3>
            {item.body && (
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">
                {item.body}
              </p>
            )}
            <Tags tags={item.tags} className="mt-2" />
          </div>
        </>
      );

    case "image":
      return (
        <>
          {item.preview ? (
            <VaultImage
              src={item.preview.thumb}
              alt={title}
              ratio={previewRatio(item)}
              fallback={<FileBlock ext={item.file?.ext ?? "img"} />}
            />
          ) : (
            <FileBlock ext={item.file?.ext ?? "img"} />
          )}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-between gap-2 opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100">
            <span className="min-w-0 truncate rounded-md bg-ink/65 px-2 py-1 text-[12px] font-medium text-ink-inverse backdrop-blur-sm">
              {title}
            </span>
            {item.colors.length > 0 && (
              <span className="flex shrink-0 gap-0.5 rounded-md bg-ink/65 p-1 backdrop-blur-sm">
                {item.colors.slice(0, 5).map((c) => (
                  <span key={c} className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
                ))}
              </span>
            )}
          </div>
          {item.tags.length > 0 && <Tags tags={item.tags} className="px-3 py-2" />}
        </>
      );

    case "file":
      return (
        <>
          {item.preview ? (
            <div className="relative">
              <VaultImage
                src={item.preview.thumb}
                alt={title}
                ratio={previewRatio(item)}
                fallback={<FileBlock ext={item.file?.ext ?? ""} />}
              />
              {item.file?.media && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-ink/60 text-ink-inverse backdrop-blur-sm">
                    <Play className="ml-0.5 size-4 fill-current" />
                  </span>
                </span>
              )}
            </div>
          ) : (
            <FileBlock ext={item.file?.ext ?? ""} />
          )}
          <div className="p-3.5">
            <h3 className="truncate text-[13.5px] font-medium text-ink">{title}</h3>
            {item.file && (
              <p className="mt-0.5 text-[12px] text-ink-subtle">
                {[
                  item.file.ext.toUpperCase(),
                  formatBytes(item.file.bytes),
                  item.file.pages && item.file.pages > 1 && `${item.file.pages} pages`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <Tags tags={item.tags} className="mt-2" />
          </div>
        </>
      );

    case "snippet": {
      const lines = item.body.split("\n");
      return (
        <div className="p-3.5">
          <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 pr-16">
            {item.title && (
              <h3 className="max-w-full truncate text-[13.5px] font-medium text-ink">
                {item.title}
              </h3>
            )}
            {languageName(item.language) && (
              <span className="shrink-0 rounded-xs bg-surface-sunken px-1.5 py-0.5 font-mono text-[10.5px] text-ink-subtle">
                {languageName(item.language)}
              </span>
            )}
          </div>
          <pre
            className={cn(
              "mt-2 overflow-hidden rounded-lg bg-surface-sunken p-3 font-mono text-[11.5px] leading-[1.6] [tab-size:2] text-ink-muted",
              lines.length > 12 &&
                "max-h-[14.5rem] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]",
            )}
          >
            {lines.slice(0, 14).join("\n")}
          </pre>
          <Tags tags={item.tags} className="mt-2" />
        </div>
      );
    }

    case "note":
      return (
        <div className="p-4">
          {item.title && (
            <h3 className="pr-8 font-heading text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink">
              {item.title}
            </h3>
          )}
          {item.body && (
            <p
              className={cn(
                "line-clamp-[9] text-[13.5px] leading-relaxed break-words whitespace-pre-wrap",
                item.title ? "mt-1 text-ink-muted" : "pr-6 text-ink",
              )}
            >
              {item.body}
            </p>
          )}
          <Tags tags={item.tags} className="mt-2.5" />
        </div>
      );
  }
}

function FileBlock({ ext }: { ext: string }) {
  return (
    <div className="flex h-28 flex-col items-center justify-center gap-1.5 bg-surface-sunken/70">
      <FileText className="size-7 text-room-vault" strokeWidth={1.5} />
      {ext && (
        <span className="font-mono text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
          .{ext}
        </span>
      )}
    </div>
  );
}

export function PendingCard({ item }: { item: PendingItem }) {
  const body: ReactNode =
    item.kind === "link" ? (
      <div className="p-3.5">
        <div className="aspect-[1.91/1] animate-pulse rounded-lg bg-surface-sunken" />
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-subtle">
          <Link2 className="size-3.5" />
          <span className="truncate">{item.label}</span>
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-muted">
          <Spinner className="size-3.5" /> Fetching preview…
        </p>
      </div>
    ) : (
      <>
        {item.image ? (
          <VaultImage src={item.image} className="opacity-60" eager />
        ) : (
          <div className="flex h-28 items-center justify-center bg-surface-sunken/70">
            <FileText className="size-7 text-ink-faint" strokeWidth={1.5} />
          </div>
        )}
        <div className="p-3.5">
          <p className="truncate text-[13px] font-medium text-ink">{item.label}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-room-vault transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round((item.progress ?? 0) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-subtle tabular-nums">
            {item.progress === 1
              ? "Finishing…"
              : `Uploading · ${Math.round((item.progress ?? 0) * 100)}%`}
          </p>
        </div>
      </>
    );

  return (
    <div
      role="status"
      aria-label={`Saving ${item.label}`}
      className="overflow-hidden rounded-xl bg-surface-raised"
    >
      {body}
    </div>
  );
}
