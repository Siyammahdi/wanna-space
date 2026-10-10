"use client";

import { LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { modKey } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { requestSettings } from "@/lib/settings";

const noSubscribe = () => () => {};

export type MenuUser = { name: string; email: string; image?: string | null };

export function UserMenu({ user, compact = false }: { user: MenuUser; compact?: boolean }) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const settingsKey = useSyncExternalStore(
    noSubscribe,
    () => modKey(","),
    () => "⌘,",
  );

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md text-left transition-colors hover:bg-surface-hover",
          compact ? "p-1" : "px-2 py-1.5",
        )}
      >
        <Avatar user={user} />
        {!compact && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
            <span className="block truncate text-[11px] text-ink-subtle">{user.email}</span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, scale: 0.94, y: compact ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: compact ? -4 : 4 }}
            transition={spring.snappy}
            className={cn(
              "absolute z-50 w-56 rounded-lg bg-surface-raised p-1.5 shadow-lg",
              compact
                ? "top-full right-0 mt-2 origin-top-right"
                : "bottom-full left-0 mb-2 origin-bottom-left",
            )}
          >
            <div className="px-2.5 py-2 leading-tight">
              <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
              <p className="truncate text-[12px] text-ink-subtle">{user.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                requestSettings();
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <Settings className="size-[15px]" />
              Settings
              <Kbd data-kbd-hints className="ml-auto [@media(hover:none)]:hidden">
                {settingsKey}
              </Kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={pending}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {pending ? <Spinner /> : <LogOut className="size-[15px]" />}
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Avatar({ user, className }: { user: MenuUser; className?: string }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote OAuth avatars, tiny and uncached
      <img
        src={user.image}
        alt=""
        className={cn("size-7 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-heading text-[13px] font-semibold text-accent-ink",
        className,
      )}
    >
      {(user.name.trim()[0] ?? user.email[0]).toUpperCase()}
    </span>
  );
}
