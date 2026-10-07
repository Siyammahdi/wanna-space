import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/config/site";

import { RoomGrid } from "./_components/room-grid";

export default function HomePage() {
  return (
    <div className="paper-grain min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-20%] left-1/2 -z-10 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-accent-soft opacity-70 blur-[120px]"
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/design" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Design system
          </Link>
          <Link href="/today" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Open your space
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <div className="max-w-3xl">
          <Reveal>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised/70 px-3 py-1 text-[12px] font-medium text-ink-muted backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              Early build · MVP in progress
            </p>
          </Reveal>
          <Reveal order={1}>
            <h1 className="font-display text-[44px] leading-[1.04] font-light tracking-[-0.02em] text-ink sm:text-[64px] md:text-[76px]">
              A quiet room for everything you’re{" "}
              <em className="font-normal text-accent italic">making.</em>
            </h1>
          </Reveal>
          <Reveal order={2}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-muted">
              {site.description} One calm place instead of six tabs.
            </p>
          </Reveal>
          <Reveal order={3} className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/today" className={buttonVariants({ size: "lg" })}>
              Enter your space
              <ArrowRight />
            </Link>
            <Link href="/design" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              See the design language
            </Link>
          </Reveal>
        </div>

        <section className="mt-24">
          <h2 className="mb-6 text-[12px] font-medium tracking-[0.12em] text-ink-subtle uppercase">
            Six rooms, one space
          </h2>
          <RoomGrid />
        </section>
      </main>
    </div>
  );
}
