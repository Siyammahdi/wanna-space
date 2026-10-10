"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

import type { SlashStore } from "./slash";

const MENU_HEIGHT = 340;

export function SlashMenu({ store }: { store: SlashStore }) {
  const state = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${state.index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [state.index]);

  const rect = state.rect;
  const below = rect ? window.innerHeight - rect.bottom > MENU_HEIGHT + 16 : true;

  return (
    <AnimatePresence>
      {state.open && rect && (
        <motion.div
          initial={{ opacity: 0, y: below ? -4 : 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
          transition={spring.snappy}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            left: Math.min(rect.left, window.innerWidth - 296),
            ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
          }}
          className={cn(
            "z-50 w-72 rounded-lg bg-surface-raised p-1.5 shadow-lg",
            below ? "origin-top-left" : "origin-bottom-left",
          )}
        >
          {state.items.length === 0 ? (
            <p className="px-2.5 py-2 text-[13px] text-ink-subtle">
              No blocks match “{state.query}”
            </p>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              aria-label="Insert a block"
              className="flex max-h-[min(340px,50vh)] flex-col gap-px overflow-y-auto"
            >
              <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
                Blocks
              </p>
              {state.items.map((item, i) => {
                const Icon = item.icon;
                const active = i === state.index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-index={i}
                    tabIndex={-1}
                    onMouseMove={() => store.hover(i)}
                    onClick={() => store.select(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                      active && "bg-surface-hover",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-muted">
                      <Icon className="size-[17px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[13.5px] font-medium text-ink">{item.label}</span>
                      <span className="block truncate text-[12px] text-ink-subtle">
                        {item.description}
                      </span>
                    </span>
                    {item.markdown && (
                      <span className="font-mono text-[11px] text-ink-faint">{item.markdown}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
