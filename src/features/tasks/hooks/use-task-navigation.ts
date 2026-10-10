"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

import { isTypingTarget } from "@/lib/keyboard";

/** `index` lets the cursor stay in place when its task leaves the list (completed, moved). */
type Cursor = { id: string | null; index: number };

type Options = {
  /** Visible rows, top to bottom: what j/k walk through. */
  order: string[];
  /** Tasks that can be shown in the panel (visible or not, e.g. a hidden completed one). */
  openable: string[];
  /** A task to open from outside (`?task=` from the command palette). */
  linkedId?: string | null;
  /** Runs after the panel closes; must be stable (it's an effect dependency downstream). */
  onClose?: () => void;
};

/**
 * Keyboard cursor and detail-panel selection for a task list: j/k or arrows move,
 * Enter/o opens, Esc clears. With the panel open, j/k flip through tasks like pages.
 */
export function useTaskNavigation({ order, openable, linkedId = null, onClose }: Options) {
  const [selectedId, setSelectedId] = useState<string | null>(linkedId);
  const [cursor, setCursor] = useState<Cursor>({ id: linkedId, index: 0 });
  const [syncedLink, setSyncedLink] = useState(linkedId);
  if (syncedLink !== linkedId) {
    setSyncedLink(linkedId);
    if (linkedId) {
      setSelectedId(linkedId);
      setCursor({ id: linkedId, index: 0 });
    }
  }

  const openId = selectedId && openable.includes(selectedId) ? selectedId : null;
  const cursorId =
    cursor.id === null
      ? null
      : order.includes(cursor.id)
        ? cursor.id
        : (order[Math.min(cursor.index, order.length - 1)] ?? null);

  function open(id: string) {
    setSelectedId(id);
    setCursor({ id, index: Math.max(order.indexOf(id), 0) });
  }

  const close = useCallback(() => {
    setSelectedId(null);
    onClose?.();
  }, [onClose]);

  function move(delta: number) {
    if (order.length === 0) return;
    const at = cursorId ? order.indexOf(cursorId) : -1;
    const index =
      at === -1
        ? delta > 0
          ? 0
          : order.length - 1
        : Math.min(Math.max(at + delta, 0), order.length - 1);
    const id = order[index]!;
    setCursor({ id, index });
    if (openId) setSelectedId(id);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
    const onControl =
      e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === "j" || (key === "ArrowDown" && cursorId)) move(1);
    else if (key === "k" || (key === "ArrowUp" && cursorId)) move(-1);
    else if ((key === "Enter" || key === "o") && cursorId && !onControl) open(cursorId);
    else if (key === "Escape" && cursorId && !openId) setCursor({ id: null, index: 0 });
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return { openId, cursorId, open, close };
}
