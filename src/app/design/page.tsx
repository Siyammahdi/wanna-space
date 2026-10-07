import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";

import { MotionLab } from "./_components/motion-lab";

export const metadata: Metadata = { title: "Design system" };

const swatchGroups: { title: string; swatches: { name: string; className: string }[] }[] = [
  {
    title: "Surfaces",
    swatches: [
      { name: "canvas", className: "bg-canvas" },
      { name: "surface-sunken", className: "bg-surface-sunken" },
      { name: "surface", className: "bg-surface" },
      { name: "surface-raised", className: "bg-surface-raised" },
      { name: "surface-hover", className: "bg-surface-hover" },
    ],
  },
  {
    title: "Ink",
    swatches: [
      { name: "ink", className: "bg-ink" },
      { name: "ink-muted", className: "bg-ink-muted" },
      { name: "ink-subtle", className: "bg-ink-subtle" },
      { name: "ink-faint", className: "bg-ink-faint" },
      { name: "line-strong", className: "bg-line-strong" },
    ],
  },
  {
    title: "Accent & feedback",
    swatches: [
      { name: "accent", className: "bg-accent" },
      { name: "accent-soft", className: "bg-accent-soft" },
      { name: "success", className: "bg-success" },
      { name: "warning", className: "bg-warning" },
      { name: "danger", className: "bg-danger" },
    ],
  },
];

export default function DesignPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-14 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeSwitcher className="w-32" />
      </header>

      <div className="mb-16 max-w-2xl">
        <p className="mb-3 text-[12px] font-medium tracking-[0.12em] text-ink-subtle uppercase">
          Design language · v0.1
        </p>
        <h1 className="font-display text-5xl font-light tracking-tight text-ink">
          Calm at rest, <em className="text-accent italic">alive</em> in motion.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
          Warm paper surfaces, serious ink, one ember accent used sparingly, and a muted hue for
          each room. Source of truth:{" "}
          <code className="font-mono text-sm">src/styles/tokens.css</code> and{" "}
          <code className="font-mono text-sm">docs/design/design-system.md</code>.
        </p>
      </div>

      <Section title="Color">
        <div className="flex flex-col gap-8">
          {swatchGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-sm font-medium text-ink">{group.title}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {group.swatches.map((s) => (
                  <Swatch key={s.name} name={s.name} className={s.className} />
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="mb-3 text-sm font-medium text-ink">Rooms</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {rooms.map((room) => {
                const Icon = room.icon;
                return (
                  <div key={room.id} className="overflow-hidden rounded-lg border border-line">
                    <div className={cn("flex h-16 items-center justify-center", room.tone.soft)}>
                      <Icon className={cn("size-6", room.tone.text)} strokeWidth={1.75} />
                    </div>
                    <div className={cn("h-2", room.tone.bg)} />
                    <p className="bg-surface-raised px-3 py-2 font-mono text-[11px] text-ink-muted">
                      room-{room.id}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-6">
          <TypeRow label="Display · Fraunces (SOFT 100)">
            <p className="font-display text-5xl font-light tracking-tight">A quiet room</p>
          </TypeRow>
          <TypeRow label="Heading · Fraunces">
            <p className="font-display text-[28px] tracking-tight">Plan the week ahead</p>
          </TypeRow>
          <TypeRow label="Body · Geist">
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-muted">
              Interface text is set in Geist for clarity at small sizes. Serif is reserved for
              moments that should feel personal: greetings, page titles, empty states.
            </p>
          </TypeRow>
          <TypeRow label="Data · Geist Mono">
            <p className="font-mono text-2xl tabular-nums">01:24:07</p>
          </TypeRow>
        </div>
      </Section>

      <Section title="Components">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="accent">
              <Plus /> Accent
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="icon" variant="secondary" aria-label="Next">
              <ArrowRight />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Done</Badge>
            <Badge tone="warning">Due soon</Badge>
            <Badge tone="danger">Overdue</Badge>
            <span className="ml-3 flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((level) => (
              <div
                key={level}
                className={cn(
                  "flex h-20 items-end rounded-lg bg-surface-raised p-3 font-mono text-[11px] text-ink-subtle",
                  {
                    xs: "shadow-xs",
                    sm: "shadow-sm",
                    md: "shadow-md",
                    lg: "shadow-lg",
                    xl: "shadow-xl",
                  }[level],
                )}
              >
                shadow-{level}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Motion">
        <MotionLab />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-12">
      <h2 className="mb-8 font-display text-2xl tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <Card className="overflow-hidden shadow-xs">
      <div className={cn("h-16 border-b border-line", className)} />
      <p className="px-3 py-2 font-mono text-[11px] text-ink-muted">{name}</p>
    </Card>
  );
}

function TypeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[200px_1fr] md:items-baseline">
      <p className="font-mono text-[11px] text-ink-subtle">{label}</p>
      <div className="text-ink">{children}</div>
    </div>
  );
}
