"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-xl border border-line bg-surface-raised/90 p-1.5 shadow-lg backdrop-blur-md md:hidden">
      {rooms.map((room) => {
        const active = pathname.startsWith(room.href);
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
            <Icon className={cn("relative size-5", active ? room.tone.text : "text-ink-subtle")} />
          </Link>
        );
      })}
    </nav>
  );
}
