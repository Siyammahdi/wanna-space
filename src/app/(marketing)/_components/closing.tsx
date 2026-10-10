import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";

/** Orbits: radius (as % of the ring box), seconds per turn, and which rooms ride it. */
const ORBITS = [
  { size: 46, period: 38, rooms: [0, 3] },
  { size: 70, period: 56, rooms: [1, 4, 6] },
  { size: 94, period: 80, rooms: [2, 5] },
];

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="relative isolate scroll-rise overflow-hidden rounded-[36px] bg-accent-soft px-6 py-20 text-center md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[min(56rem,160%)] -translate-x-1/2 -translate-y-1/2"
        >
          {ORBITS.map((o) => (
            <div
              key={o.size}
              className="absolute animate-spin rounded-full ring-[1.5px] ring-fern/15 ring-inset"
              style={{ inset: `${(100 - o.size) / 2}%`, animationDuration: `${o.period}s` }}
            >
              {o.rooms.map((r, k) => (
                <div
                  key={r}
                  className="absolute inset-0"
                  style={{ rotate: `${(360 / o.rooms.length) * k + o.size * 3}deg` }}
                >
                  <span
                    className={cn(
                      "absolute top-0 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                      rooms[r]!.tone.bg,
                    )}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mx-auto flex size-20 items-center justify-center rounded-[26px] bg-surface-raised shadow-xl">
          <LogoMark className="size-10" />
        </div>
        <h2
          id="closing-title"
          className="mx-auto mt-8 max-w-2xl font-heading text-[40px] leading-[1.02] font-medium tracking-[-0.045em] md:text-[64px]"
        >
          Make yourself a space.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-ink-muted">
          Your tasks, plans, notes, time and inspiration, finally under one roof. It takes a minute
          to move in.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
            Create your space
            <ArrowRight />
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            I already have one
          </Link>
        </div>
      </div>
    </section>
  );
}
