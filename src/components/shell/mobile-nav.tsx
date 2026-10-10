"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { requestQuickCapture } from "@/lib/quick-capture";

import { useSettings } from "./settings-context";
import { isActive, shownRooms } from "./sidebar";

export function MobileNav() {
  const pathname = usePathname();
  const { hiddenRooms } = useSettings();

  return (
    <>
      <button
        type="button"
        aria-label="Quick capture"
        onClick={requestQuickCapture}
        className="fixed right-4 bottom-[84px] z-40 flex size-12 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg transition-transform active:scale-90 md:hidden"
      >
        <Plus className="size-5" strokeWidth={2.25} />
      </button>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-xl bg-surface-raised/90 p-1.5 shadow-lg backdrop-blur-md md:hidden">
        {shownRooms(hiddenRooms, pathname).map((room) => {
          const active = isActive(room.href, pathname);
          const Icon = room.icon;
          return (
            <Link
              key={room.id}
              href={room.href}
              aria-label={room.label}
              aria-current={active ? "page" : undefined}
              className="relative flex h-11 flex-1 items-center justify-center rounded-lg"
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={spring.glide}
                  className={cn("absolute inset-0 rounded-lg", room.tone.soft)}
                />
              )}
              <Icon
                className={cn("relative size-5", active ? room.tone.text : "text-ink-subtle")}
              />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
