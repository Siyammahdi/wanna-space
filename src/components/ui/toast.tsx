"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { spring } from "@/lib/motion";

export type ToastOptions = {
  /** Reusing an id replaces that toast instead of stacking a new one. */
  id?: string;
  message: string;
  detail?: string;
  action?: { label: string; onAction: () => void; hint?: string };
  duration?: number;
};

type ToastItem = Required<Pick<ToastOptions, "id" | "message" | "duration">> &
  Omit<ToastOptions, "id" | "message" | "duration">;

const MAX_VISIBLE = 3;
const EMPTY: ToastItem[] = [];
let toasts: ToastItem[] = EMPTY;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast({ id = `toast-${++seq}`, duration = 4000, ...rest }: ToastOptions) {
  toasts = [...toasts.filter((t) => t.id !== id), { id, duration, ...rest }].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export function dismissToast(id: string) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Mount once per layout. Bottom-center, above the mobile nav. */
export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-36 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast: t }: { toast: ToastItem }) {
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dismissToast(t.id), t.duration);
  };
  const pause = () => window.clearTimeout(timer.current);

  // Restarts when the toast is replaced (same id, new content).
  useEffect(() => {
    const { id, duration } = t;
    timer.current = window.setTimeout(() => dismissToast(id), duration);
    return () => window.clearTimeout(timer.current);
  }, [t]);

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={spring.snappy}
      onPointerEnter={pause}
      onPointerLeave={start}
      onFocus={pause}
      onBlur={start}
      className="pointer-events-auto flex max-w-full min-w-0 items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-ink-inverse shadow-lg"
    >
      <p className="min-w-0 truncate text-[13.5px]">
        <span className="font-medium">{t.message}</span>
        {t.detail && <span className="ml-1.5 text-ink-inverse/65">{t.detail}</span>}
      </p>
      {t.action ? (
        <button
          type="button"
          onClick={() => {
            dismissToast(t.id);
            t.action!.onAction();
          }}
          className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-ink-inverse/12 px-3 text-[13px] font-semibold transition-colors hover:bg-ink-inverse/20"
        >
          {t.action.label}
          {t.action.hint && (
            <span className="hidden text-[11px] font-medium text-ink-inverse/60 [@media(hover:hover)]:inline">
              {t.action.hint}
            </span>
          )}
        </button>
      ) : (
        <span className="w-2" />
      )}
    </motion.div>
  );
}
