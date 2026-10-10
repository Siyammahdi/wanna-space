"use client";

import {
  AlarmClock,
  Bookmark,
  CalendarRange,
  Columns3,
  ListTodo,
  StickyNote,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { getRoom, type RoomId } from "@/config/rooms";
import { cn } from "@/lib/cn";

import { useScrollProgress } from "./use-landing";

type Spot = { x: number; y: number; r?: number };

type Layout = {
  w: number;
  h: number;
  tile: { w: number; h: number };
  frame: { x: number; y: number; w: number; h: number };
  today: { x: number; y: number; w: number };
  from: Record<Piece, Spot>;
  to: Record<Piece, Spot>;
};

type Piece = Exclude<RoomId, "today">;

const PIECES: { room: Piece; app: string; icon: LucideIcon }[] = [
  { room: "tasks", app: "To-do app", icon: ListTodo },
  { room: "orbit", app: "Kanban board", icon: Columns3 },
  { room: "planner", app: "Calendar", icon: CalendarRange },
  { room: "notes", app: "Notes app", icon: StickyNote },
  { room: "time", app: "Pomodoro timer", icon: AlarmClock },
  { room: "vault", app: "Bookmarks", icon: Bookmark },
];

/* Design canvases; the stage scales them to fit. */
const WIDE: Layout = {
  w: 1000,
  h: 560,
  tile: { w: 180, h: 118 },
  frame: { x: 180, y: 40, w: 640, h: 450 },
  today: { x: 214, y: 388, w: 572 },
  from: {
    tasks: { x: 0, y: 30, r: -9 },
    orbit: { x: 300, y: 0, r: 5 },
    planner: { x: 40, y: 400, r: 7 },
    notes: { x: 810, y: 20, r: 8 },
    time: { x: 815, y: 410, r: -7 },
    vault: { x: 520, y: 440, r: -4 },
  },
  to: {
    tasks: { x: 214, y: 112 },
    orbit: { x: 410, y: 112 },
    planner: { x: 606, y: 112 },
    notes: { x: 214, y: 246 },
    time: { x: 410, y: 246 },
    vault: { x: 606, y: 246 },
  },
};

const NARROW: Layout = {
  w: 400,
  h: 640,
  tile: { w: 156, h: 104 },
  frame: { x: 22, y: 20, w: 356, h: 600 },
  today: { x: 38, y: 448, w: 324 },
  from: {
    tasks: { x: -6, y: 0, r: -9 },
    orbit: { x: 240, y: 30, r: 6 },
    planner: { x: 110, y: 190, r: -5 },
    notes: { x: -10, y: 380, r: 7 },
    time: { x: 250, y: 340, r: -7 },
    vault: { x: 120, y: 520, r: 4 },
  },
  to: {
    tasks: { x: 38, y: 84 },
    orbit: { x: 206, y: 84 },
    planner: { x: 38, y: 204 },
    notes: { x: 206, y: 204 },
    time: { x: 38, y: 324 },
    vault: { x: 206, y: 324 },
  },
};

/** Scattered single-purpose apps fly together into the rooms of one space. */
export function Converge() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(section, ["start start", "end end"]);
  const [fit, setFit] = useState({ layout: WIDE, scale: 1 });

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const layout = width < 640 ? NARROW : WIDE;
      const scale = Math.min(1.15, width / layout.w, height / layout.h);
      setFit({ layout, scale: Math.max(scale, 0.3) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const before = useTransform(progress, [0.05, 0.3, 0.42], [1, 1, 0]);
  const beforeY = useTransform(progress, [0.3, 0.42], [0, -16]);
  const after = useTransform(progress, [0.44, 0.56], [0, 1]);
  const afterY = useTransform(progress, [0.44, 0.56], [16, 0]);
  const { layout, scale } = fit;

  return (
    <section
      ref={section}
      aria-labelledby="converge-title"
      className="relative h-[280vh] in-data-[motion=reduced]:h-auto motion-reduce:h-auto"
    >
      <div className="sticky top-0 flex h-dvh flex-col overflow-hidden px-6 pt-24 pb-8 in-data-[motion=reduced]:static motion-reduce:static">
        <h2 id="converge-title" className="sr-only">
          From six apps to one space
        </h2>
        <div className="relative mx-auto h-28 w-full max-w-3xl text-center md:h-32">
          <motion.div style={{ opacity: before, y: beforeY }} className="absolute inset-0">
            <p className="text-[12px] font-medium tracking-[0.12em] text-ink-subtle uppercase">
              The usual way
            </p>
            <p className="mt-3 font-heading text-[28px] leading-[1.08] font-medium tracking-[-0.035em] md:text-[44px]">
              Six apps. Six logins. Nothing talks to anything.
            </p>
          </motion.div>
          <motion.div style={{ opacity: after, y: afterY }} className="absolute inset-0">
            <p className="text-[12px] font-medium tracking-[0.12em] text-accent uppercase">
              The Wanna Space way
            </p>
            <p className="mt-3 font-heading text-[28px] leading-[1.08] font-medium tracking-[-0.035em] md:text-[44px]">
              One space, where every room knows the others.
            </p>
          </motion.div>
        </div>

        <div ref={stage} className="relative mt-4 min-h-0 flex-1">
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2"
            style={{
              width: layout.w,
              height: layout.h,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            <Frame layout={layout} progress={progress} />
            {PIECES.map((piece) => (
              <Tile key={piece.room} piece={piece} layout={layout} progress={progress} />
            ))}
            <TodayStrip layout={layout} progress={progress} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Frame({ layout, progress }: { layout: Layout; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.36, 0.52], [0, 1]);
  const scale = useTransform(progress, [0.36, 0.56], [0.94, 1]);
  const { frame } = layout;
  return (
    <motion.div
      style={{ opacity, scale, left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
      className="absolute rounded-[28px] bg-surface-raised/85 shadow-xl backdrop-blur"
    >
      <div className="flex h-14 items-center gap-2.5 px-5">
        <LogoMark className="size-6" />
        <span className="font-heading text-[15px] font-bold tracking-tight">Your space</span>
        <span className="ml-auto flex gap-1">
          {PIECES.map((p) => (
            <span key={p.room} className={cn("size-1.5 rounded-full", getRoom(p.room).tone.bg)} />
          ))}
        </span>
      </div>
    </motion.div>
  );
}

function Tile({
  piece,
  layout,
  progress,
}: {
  piece: (typeof PIECES)[number];
  layout: Layout;
  progress: MotionValue<number>;
}) {
  const from = layout.from[piece.room];
  const to = layout.to[piece.room];
  const order = PIECES.indexOf(piece);
  const start = 0.08 + order * 0.025;
  const end = start + 0.36;

  const x = useTransform(progress, [start, end], [from.x, to.x]);
  const y = useTransform(progress, [start, end], [from.y, to.y]);
  const rotate = useTransform(progress, [start, end], [from.r ?? 0, 0]);
  const generic = useTransform(progress, [end - 0.1, end - 0.05], [1, 0]);
  const room = useTransform(progress, [end - 0.06, end], [0, 1]);

  const r = getRoom(piece.room);
  const AppIcon = piece.icon;
  const RoomIcon = r.icon;
  const { w, h } = layout.tile;

  return (
    <motion.div style={{ x, y, rotate, width: w, height: h }} className="absolute top-0 left-0">
      <motion.div
        style={{ opacity: generic }}
        className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-surface p-4 shadow-lg"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-surface-sunken">
          <AppIcon className="size-4.5 text-ink-subtle" strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-[14px] font-medium text-ink-muted">{piece.app}</span>
          <span className="block text-[11.5px] text-ink-faint">Another login</span>
        </span>
      </motion.div>
      <motion.div
        style={{ opacity: room }}
        className={cn(
          "absolute inset-0 flex flex-col justify-between rounded-2xl p-4",
          r.tone.soft,
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-surface-raised/70">
          <RoomIcon className={cn("size-4.5", r.tone.text)} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block font-heading text-[16px] font-semibold tracking-tight text-ink">
            {r.label}
          </span>
          <span className="block truncate text-[11.5px] text-ink-muted">{r.tagline}</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function TodayStrip({ layout, progress }: { layout: Layout; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.62, 0.74], [0, 1]);
  const y = useTransform(progress, [0.62, 0.74], [18, 0]);
  const today = getRoom("today");
  const { x, y: top, w } = layout.today;
  const narrow = layout === NARROW;
  return (
    <motion.div
      style={{ opacity, y, left: x, top, width: w }}
      className={cn(
        "absolute flex gap-3 rounded-2xl p-4",
        today.tone.soft,
        narrow ? "flex-col" : "items-center",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-surface-raised/70">
          <Sun className={cn("size-4.5", today.tone.text)} strokeWidth={1.8} />
        </span>
        <span className="font-heading text-[16px] font-semibold tracking-tight">Today</span>
      </span>
      <span
        className={cn("flex flex-wrap gap-1.5 text-[12px] text-ink-muted", !narrow && "ml-auto")}
      >
        <Pill tone="bg-room-tasks">3 due</Pill>
        <Pill tone="bg-room-planner">2 planned</Pill>
        <Pill tone="bg-room-time">1h 40m focused</Pill>
        <Pill tone="bg-room-orbit">Launch 64%</Pill>
      </span>
    </motion.div>
  );
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-surface-raised/80 px-2.5 py-1">
      <span className={cn("size-1.5 rounded-full", tone)} />
      {children}
    </span>
  );
}
