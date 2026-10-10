import { ArrowDown, ArrowRight } from "lucide-react";
import type { Viewport } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/config/site";

import { Closing } from "./_components/closing";
import { Converge } from "./_components/converge";
import { HeroStage } from "./_components/hero-stage";
import { Moments } from "./_components/moments";
import { Principles } from "./_components/principles";
import { RoomGrid } from "./_components/room-grid";
import { SiteFooter } from "./_components/site-footer";
import { SiteNav } from "./_components/site-nav";
import { Tour } from "./_components/tour";

/** The landing page is always light, so the browser chrome is too. */
export const viewport: Viewport = { themeColor: "#f6f6ee" };

export default function HomePage() {
  return (
    <div className="paper-grain min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-12rem] left-1/2 -z-10 h-[44rem] w-[72rem] -translate-x-1/2 rounded-full bg-cream opacity-90 blur-[120px]"
      />

      <SiteNav />

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-10 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-raised/70 px-3 py-1 text-[12px] font-medium text-ink-muted backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                Early build · MVP in progress
              </p>
            </Reveal>
            <Reveal order={1}>
              <h1 className="font-heading text-[44px] leading-[1.02] font-medium tracking-[-0.045em] text-ink sm:text-[64px] md:text-[80px]">
                A quiet room for everything you’re <span className="text-accent">making.</span>
              </h1>
            </Reveal>
            <Reveal order={2}>
              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-muted md:text-[19px]">
                {site.description} One calm place instead of six tabs.
              </p>
            </Reveal>
            <Reveal order={3} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                Create your space
                <ArrowRight />
              </Link>
              <a href="#tour" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                See how it works
                <ArrowDown />
              </a>
            </Reveal>
          </div>

          <HeroStage />
        </section>

        <Converge />
        <Tour />
        <Moments />
        <Principles />

        <section
          id="rooms"
          aria-labelledby="rooms-title"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 pt-24 md:pt-32"
        >
          <div className="mb-10 max-w-2xl scroll-rise">
            <p className="text-[12px] font-medium tracking-[0.12em] text-accent uppercase">
              Seven rooms, one space
            </p>
            <h2
              id="rooms-title"
              className="mt-3 font-heading text-[34px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[52px]"
            >
              Every room, a door away.
            </h2>
          </div>
          <RoomGrid />
        </section>

        <Closing />
      </main>

      <SiteFooter />
    </div>
  );
}
