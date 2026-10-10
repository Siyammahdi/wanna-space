"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  Inbox,
  Maximize2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";

import { itemLabel } from "../filters";
import type { VaultItem } from "../schema";
import { useVault } from "./vault-provider";

export const downloadHref = (item: VaultItem) => `/api/vault/${item.id}/download`;

export async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ message: `${what} copied` });
  } catch {
    toast({ message: `Couldn’t copy the ${what.toLowerCase()}` });
  }
}

/** The ⋯ menu of a card; also opened by right-click and the menu key. */
export function ItemMenu({
  item,
  open,
  onOpenChange,
  trigger,
  onOpenDetail,
}: {
  item: VaultItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  onOpenDetail: () => void;
}) {
  const { collections, update, remove } = useVault();
  const [view, setView] = useState<"main" | "move">("main");
  const close = () => {
    onOpenChange(false);
    setView("main");
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const moveTo = (collectionId: string | null) => {
    close();
    if (collectionId === item.collectionId) return;
    const name = collections.find((c) => c.id === collectionId)?.name ?? "Unsorted";
    void update(item.id, { collectionId }, { announce: `Moved to ${name}` });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      label={`${itemLabel(item)} options`}
      align="end"
      className="w-56"
      trigger={trigger}
    >
      {view === "move" ? (
        <FocusFirst key="move">
          <MenuItem icon={<ArrowLeft />} onSelect={() => setView("main")}>
            Back
          </MenuItem>
          <MenuGap />
          <MenuItem
            icon={item.collectionId === null ? <Check /> : <Inbox />}
            active={item.collectionId === null}
            onSelect={() => moveTo(null)}
          >
            Unsorted
          </MenuItem>
          {collections.map((c) => (
            <MenuItem
              key={c.id}
              icon={item.collectionId === c.id ? <Check /> : <span className="size-[15px]" />}
              active={item.collectionId === c.id}
              onSelect={() => moveTo(c.id)}
            >
              {c.name}
            </MenuItem>
          ))}
          {collections.length === 0 && (
            <p className="px-2.5 py-2 text-[12px] leading-snug text-ink-faint">
              Make a collection with “New collection” above the board.
            </p>
          )}
        </FocusFirst>
      ) : (
        <FocusFirst key="main">
          <MenuItem icon={<Maximize2 />} hint="↵" onSelect={run(onOpenDetail)}>
            Open details
          </MenuItem>
          {item.url && (
            <>
              <MenuItem
                icon={<ExternalLink />}
                onSelect={run(() => window.open(item.url!, "_blank", "noopener,noreferrer"))}
              >
                Open {item.kind === "image" ? "original" : "site"}
              </MenuItem>
              <MenuItem icon={<Copy />} onSelect={run(() => void copyText(item.url!, "Link"))}>
                Copy link
              </MenuItem>
            </>
          )}
          {(item.kind === "snippet" || item.kind === "note") && (
            <MenuItem
              icon={<Copy />}
              onSelect={run(
                () => void copyText(item.body, item.kind === "snippet" ? "Code" : "Note"),
              )}
            >
              Copy {item.kind === "snippet" ? "code" : "text"}
            </MenuItem>
          )}
          {item.file && (
            <MenuItem
              icon={<Download />}
              onSelect={run(() => window.location.assign(downloadHref(item)))}
            >
              Download
            </MenuItem>
          )}
          <MenuItem icon={<FolderInput />} onSelect={() => setView("move")}>
            Move to…
          </MenuItem>
          <MenuGap />
          <MenuItem icon={<Trash2 />} tone="danger" hint="⌫" onSelect={run(() => remove(item))}>
            Delete
          </MenuItem>
        </FocusFirst>
      )}
    </Popover>
  );
}

/** Switching the menu's view keeps keyboard focus inside it. */
function FocusFirst({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, []);
  return <div ref={ref}>{children}</div>;
}
