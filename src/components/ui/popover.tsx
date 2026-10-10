"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  align?: "start" | "end";
  className?: string;
};

const ITEMS = "button:not(:disabled), input:not(:disabled)";

/**
 * Lightweight anchored panel: closes on outside pointer-down and Escape. Opening moves
 * focus to the first item, arrow keys walk the items, and closing hands focus back.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  label,
  align = "end",
  className,
}: PopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>(ITEMS)?.focus({ preventScroll: true }),
    );
    const onPointer = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      // Only if nothing else claimed focus (an inline editor, the detail panel …).
      const active = document.activeElement;
      if (active === document.body || root?.contains(active)) {
        returnTo?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target instanceof HTMLInputElement) return;
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];
    const at = items.indexOf(e.target as HTMLElement);
    const go = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at === -1 ? -1 : at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(-1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div ref={rootRef} className="relative">
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -2, transition: { duration: 0.12 } }}
            transition={spring.snappy}
            className={cn(
              "absolute top-full z-50 mt-1.5 min-w-52 rounded-lg bg-surface-raised p-1.5 shadow-lg",
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type MenuItemProps = {
  icon?: ReactNode;
  hint?: ReactNode;
  active?: boolean;
  tone?: "default" | "danger";
  onSelect: () => void;
  children: ReactNode;
};

export function MenuItem({
  icon,
  hint,
  active,
  tone = "default",
  onSelect,
  children,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors focus-visible:-outline-offset-2 [&_svg]:size-[15px] [&_svg]:shrink-0",
        tone === "danger"
          ? "text-danger hover:bg-danger-soft"
          : active
            ? "bg-surface-hover/70 font-medium text-ink hover:bg-surface-hover"
            : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-[12px] text-ink-faint">{hint}</span>}
    </button>
  );
}

/** Groups items by space rather than lines. */
export function MenuGap() {
  return <div aria-hidden className="h-1.5" />;
}
