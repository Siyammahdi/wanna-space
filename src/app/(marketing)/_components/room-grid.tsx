"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export function RoomGrid() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room, i) => {
        const Icon = room.icon;
        return (
          <li
            key={room.id}
            className="animate-rise"
            style={{ animationDelay: `${350 + i * 70}ms` }}
          >
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={spring.snappy}
            >
              <Link
                href={room.href}
                className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-xl border border-line bg-surface-raised/80 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg"
              >
                <div
                  aria-hidden
                  className={cn(
                    "absolute -top-16 -right-16 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70",
                    room.tone.soft,
                  )}
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:-rotate-6",
                      room.tone.soft,
                    )}
                  >
                    <Icon className={cn("size-5", room.tone.text)} strokeWidth={1.75} />
                  </span>
                  {room.status === "building" ? (
                    <Badge tone="accent">Building now</Badge>
                  ) : (
                    <Badge>Planned</Badge>
                  )}
                </div>
                <div className="relative">
                  <h3 className="font-display text-xl tracking-tight text-ink">{room.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{room.description}</p>
                </div>
              </Link>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
