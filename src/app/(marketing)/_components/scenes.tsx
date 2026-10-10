"use client";

import {
  CalendarDays,
  Check,
  CheckSquare,
  CornerDownLeft,
  FileText,
  Flag,
  Hash,
  Heading2,
  Link2,
  List,
  Pause,
  Quote,
  Timer,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { getRoom, type RoomId } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { ease, spring } from "@/lib/motion";

import { useSequence } from "./use-landing";

export type SceneId = Exclude<RoomId, "today">;

export function Scene({ id }: { id: SceneId }) {
  switch (id) {
    case "tasks":
      return <CaptureScene />;
    case "planner":
      return <PlanScene />;
    case "orbit":
      return <OrbitScene />;
    case "time":
      return <FocusScene />;
    case "notes":
      return <NotesScene />;
    case "vault":
      return <VaultScene />;
  }
}

function SceneFrame({
  id,
  title,
  className,
  children,
  ref,
}: {
  id: SceneId;
  title: string;
  className?: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const room = getRoom(id);
  const Icon = room.icon;
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("flex h-full flex-col rounded-2xl bg-surface-raised p-5", className)}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-lg", room.tone.soft)}>
          <Icon className={cn("size-3.5", room.tone.text)} strokeWidth={2} />
        </span>
        <span className="font-heading text-[14px] font-semibold tracking-tight">{title}</span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/* ── Tasks: natural-language quick add ─────────────────────────────── */

const PHRASE = "Pay rent fri p1 twp";
const TOKENS = [
  { text: "fri", at: 9, tone: "bg-room-planner-soft text-room-planner" },
  { text: "p1", at: 13, tone: "bg-accent-soft text-accent-ink" },
  { text: "twp", at: 16, tone: "bg-room-orbit-soft text-room-orbit" },
];
const CAPTURE = [900, ...Array.from(PHRASE, (c) => (c === " " ? 170 : 85)), 700, 2600];

function CaptureScene() {
  const { ref, step } = useSequence(CAPTURE);
  const typed = Math.min(step, PHRASE.length);
  const filed = step === CAPTURE.length - 1;
  const text = filed ? "" : PHRASE.slice(0, typed);
  const found = TOKENS.filter((t) => typed >= t.at + t.text.length && !filed);

  return (
    <SceneFrame ref={ref} id="tasks" title="Inbox">
      <div className="flex h-11 items-center gap-2 rounded-xl bg-surface px-3.5 text-[14px]">
        <span className="min-w-0 flex-1 truncate">
          {text ? (
            <Highlighted text={text} found={found} />
          ) : (
            <span className="text-ink-faint">Add a task…</span>
          )}
          {!filed && (
            <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" />
          )}
        </span>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-md transition-colors",
            step === CAPTURE.length - 2
              ? "bg-ink text-canvas"
              : "bg-surface-sunken text-ink-subtle",
          )}
        >
          <CornerDownLeft className="size-3" />
        </span>
      </div>

      <div className="mt-2 flex h-7 flex-wrap gap-1.5">
        <AnimatePresence>
          {found.map((t) => (
            <motion.span
              key={t.text}
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring.bouncy}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                t.tone,
              )}
            >
              {t.text === "fri" && (
                <>
                  <CalendarDays className="size-3" /> Friday
                </>
              )}
              {t.text === "p1" && (
                <>
                  <Flag className="size-3" /> Priority 1
                </>
              )}
              {t.text === "twp" && (
                <>
                  <Hash className="size-3" /> Techwitpro
                </>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {filed && (
            <motion.li
              key="new"
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={spring.gentle}
            >
              <Row title="Pay rent" meta="Fri · P1 · Techwitpro" tone="bg-room-orbit" fresh />
            </motion.li>
          )}
        </AnimatePresence>
        <motion.li layout transition={spring.gentle}>
          <Row title="Reply to Nadia about the brief" meta="Today" tone="bg-room-today" />
        </motion.li>
        <motion.li layout transition={spring.gentle}>
          <Row title="Water the plants" meta="Every Sunday · Home" tone="bg-room-tasks" />
        </motion.li>
      </ul>
    </SceneFrame>
  );
}

function Highlighted({ text, found }: { text: string; found: typeof TOKENS }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const t of found) {
    parts.push(text.slice(cursor, t.at));
    parts.push(
      <span key={t.text} className={cn("rounded px-0.5", t.tone)}>
        {t.text}
      </span>,
    );
    cursor = t.at + t.text.length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function Row({
  title,
  meta,
  tone,
  fresh,
}: {
  title: string;
  meta: string;
  tone: string;
  fresh?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5",
        fresh ? "bg-accent-soft/60" : "bg-surface/60",
      )}
    >
      <span className="size-4 shrink-0 rounded-full ring-[1.5px] ring-line-strong ring-inset" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px]">{title}</span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-subtle">
          <span className={cn("size-1.5 rounded-full", tone)} />
          {meta}
        </span>
      </span>
    </div>
  );
}

/* ── Planner: drag a task onto the week ────────────────────────────── */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_CARDS: Record<string, { title: string; tone: string }[]> = {
  Mon: [
    { title: "Standup", tone: "bg-room-notes" },
    { title: "Groceries", tone: "bg-room-tasks" },
  ],
  Tue: [
    { title: "Client call", tone: "bg-room-orbit" },
    { title: "Gym", tone: "bg-room-tasks" },
  ],
  Wed: [{ title: "Gym", tone: "bg-room-tasks" }],
  Thu: [
    { title: "Invoice", tone: "bg-room-tasks" },
    { title: "Dentist", tone: "bg-room-planner" },
    { title: "Podcast", tone: "bg-room-orbit" },
  ],
  Fri: [
    { title: "Pay rent", tone: "bg-room-orbit" },
    { title: "Review", tone: "bg-room-orbit" },
  ],
};
const PLAN = [1300, 2600];

function PlanScene() {
  const { ref, step } = useSequence(PLAN);
  const planned = step === 1;
  const draft = (
    <motion.div
      layoutId="plan-draft"
      transition={spring.gentle}
      className="rounded-lg bg-room-planner px-2.5 py-2 text-[11.5px] font-medium text-accent-contrast shadow-md"
    >
      Draft pitch deck
    </motion.div>
  );

  return (
    <SceneFrame ref={ref} id="planner" title="This week">
      <LayoutGroup id="plan">
        <div className="mb-3 flex h-12 items-center gap-2 rounded-xl bg-surface/70 px-3">
          <span className="text-[11px] font-medium text-ink-subtle">Unplanned</span>
          <span className="rounded-lg bg-surface-raised px-2.5 py-2 text-[11.5px] text-ink-muted">
            Call the bank
          </span>
          <div className="w-32">{!planned && draft}</div>
        </div>
        <div className="grid h-[calc(100%-3.75rem)] grid-cols-5 gap-1.5">
          {DAYS.map((day) => (
            <div
              key={day}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl p-1.5 transition-colors duration-500",
                day === "Wed" && planned ? "bg-room-planner-soft" : "bg-surface/60",
              )}
            >
              <span className="px-1 pt-0.5 text-[10.5px] font-medium text-ink-subtle">{day}</span>
              {WEEK_CARDS[day]!.map((c) => (
                <span
                  key={c.title}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-raised px-2 py-1.5 text-[11px]"
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", c.tone)} />
                  <span className="truncate">{c.title}</span>
                </span>
              ))}
              {day === "Wed" && planned && draft}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </SceneFrame>
  );
}

/* ── Orbit: move a card along, watch the ring close ────────────────── */

const STAGES = [
  { name: "Shaping", cards: ["Pricing page", "Onboarding", "Help center"] },
  { name: "Building", cards: ["Landing page"] },
  { name: "Shipped", cards: ["Brand kit", "Sign in"] },
];
const ORBIT = [1400, 2600];

function OrbitScene() {
  const { ref, step } = useSequence(ORBIT);
  const moved = step === 1;
  const total = 6;
  const done = moved ? 3 : 2;
  const card = (
    <motion.span
      layoutId="orbit-card"
      transition={spring.gentle}
      className={cn(
        "block rounded-lg px-2.5 py-2 text-[11.5px] transition-colors duration-500",
        moved ? "bg-room-orbit-soft text-room-orbit" : "bg-surface-raised",
      )}
    >
      Landing page
    </motion.span>
  );

  return (
    <SceneFrame ref={ref} id="orbit" title="Launch plan">
      <div className="mb-4 flex items-center gap-4">
        <svg viewBox="0 0 44 44" className="size-14 -rotate-90">
          <circle
            cx="22"
            cy="22"
            r="18"
            className="fill-none stroke-room-orbit-soft"
            strokeWidth="5"
          />
          <motion.circle
            cx="22"
            cy="22"
            r="18"
            strokeLinecap="round"
            className="fill-none stroke-room-orbit"
            strokeWidth="5"
            initial={false}
            animate={{ pathLength: done / total }}
            transition={{ duration: 0.9, ease: ease.out }}
          />
        </svg>
        <div>
          <p className="font-heading text-[22px] font-semibold tabular-nums">
            {done}/{total} shipped
          </p>
          <div className="mt-1.5 flex h-1.5 w-40 gap-1">
            {STAGES.map((s, i) => (
              <span
                key={s.name}
                className={cn(
                  "flex-1 rounded-full",
                  i === 2 ? "bg-room-orbit" : i === 1 ? "bg-room-orbit/50" : "bg-room-orbit/20",
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <LayoutGroup id="orbit">
        <div className="grid grid-cols-3 gap-2">
          {STAGES.map((s) => (
            <div
              key={s.name}
              className="flex min-h-44 flex-col gap-1.5 rounded-xl bg-surface/60 p-2"
            >
              <span className="px-1 text-[10.5px] font-medium text-ink-subtle">{s.name}</span>
              {s.cards.map((c) =>
                c === "Landing page" ? (
                  !moved && <span key={c}>{card}</span>
                ) : (
                  <span key={c} className="rounded-lg bg-surface-raised px-2.5 py-2 text-[11.5px]">
                    {c}
                  </span>
                ),
              )}
              {s.name === "Shipped" && moved && card}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </SceneFrame>
  );
}

/* ── Time: a focus session ticking down ────────────────────────────── */

const FOCUS = Array.from({ length: 40 }, () => 1000);
const FOCUS_START = 18 * 60 + 40;

function FocusScene() {
  const { ref, step } = useSequence(FOCUS);
  const left = FOCUS_START - step;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const share = 1 - left / (25 * 60);
  const bars = [40, 66, 82, 50, 74];

  return (
    <SceneFrame ref={ref} id="time" title="Focus">
      <div className="flex h-full flex-col items-center justify-center gap-5 sm:flex-row sm:justify-around">
        <div className="relative size-40">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="fill-none stroke-room-time-soft"
              strokeWidth="7"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              strokeLinecap="round"
              className="fill-none stroke-room-time"
              strokeWidth="7"
              initial={false}
              animate={{ pathLength: share }}
              transition={{ duration: step === 0 ? 0 : 1, ease: "linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-[32px] font-semibold tracking-tight tabular-nums">
              {mm}:{ss}
            </span>
            <span className="text-[11px] text-ink-subtle">of 25:00</span>
          </div>
        </div>
        <div className="flex w-full max-w-48 flex-col gap-3">
          <div className="rounded-xl bg-room-time-soft/70 p-3">
            <p className="flex items-center gap-1 text-[11px] font-medium text-room-time">
              <Timer className="size-3" /> Focusing on
            </p>
            <p className="mt-0.5 text-[13px]">Write the landing copy</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted">
              <Pause className="size-2.5" /> Pause
            </span>
          </div>
          <div className="rounded-xl bg-surface/70 p-3">
            <p className="text-[11px] text-ink-subtle">This week</p>
            <div className="mt-2 flex h-12 items-end gap-1.5">
              {bars.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h + (i === 4 ? share * 18 : 0)}%` }}
                  className={cn(
                    "flex-1 rounded-[3px] transition-[height] duration-1000",
                    i === 4 ? "bg-room-time" : "bg-room-time/35",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}

/* ── Notes: slash command inserts a block ──────────────────────────── */

const MENU = [
  { label: "Heading", icon: Heading2 },
  { label: "To-do list", icon: CheckSquare },
  { label: "Bulleted list", icon: List },
  { label: "Quote", icon: Quote },
  { label: "Link to page", icon: Link2 },
];
const NOTES = [1000, 900, 450, 450, 2800];

function NotesScene() {
  const { ref, step } = useSequence(NOTES);
  const open = step >= 1 && step <= 3;
  const active = step <= 2 ? 0 : 1;
  const inserted = step === 4;

  return (
    <SceneFrame ref={ref} id="notes" title="Launch notes">
      <div className="px-1">
        <p className="font-heading text-[22px] font-semibold tracking-[-0.03em]">Launch week</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Soft launch on Tuesday, then the newsletter on Thursday. Keep the copy calm and specific.
        </p>
        <div className="relative mt-3 min-h-8">
          {inserted ? (
            <motion.ul
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
              className="flex flex-col gap-1.5"
            >
              <li className="flex items-center gap-2 text-[13px]">
                <span className="flex size-4 items-center justify-center rounded-[5px] bg-room-notes">
                  <Check className="size-2.5 text-accent-contrast" strokeWidth={3} />
                </span>
                <span className="text-ink-subtle line-through">Book the photographer</span>
              </li>
              <li className="flex items-center gap-2 text-[13px]">
                <span className="size-4 rounded-[5px] ring-[1.5px] ring-line-strong ring-inset" />
                Send invites
              </li>
            </motion.ul>
          ) : (
            <p className="text-[13px]">
              {step >= 1 ? "/" : ""}
              <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" />
              {step === 0 && <span className="ml-1 text-ink-faint">Type / for blocks</span>}
            </p>
          )}

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={spring.snappy}
                className="absolute top-7 left-0 w-52 origin-top-left rounded-xl bg-surface-raised p-1.5 shadow-xl"
              >
                {MENU.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px]"
                    >
                      {i === active && (
                        <motion.span
                          layoutId="notes-active"
                          transition={spring.glide}
                          className="absolute inset-0 rounded-lg bg-room-notes-soft"
                        />
                      )}
                      <Icon className="relative size-3.5 text-room-notes" />
                      <span className="relative">{item.label}</span>
                    </span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface/70 px-2.5 py-2 text-[12px] text-ink-muted">
          <FileText className="size-3.5 text-room-notes" />
          Linked: Landing copy draft
        </div>
      </div>
    </SceneFrame>
  );
}

/* ── Vault: things worth keeping, saved in one place ───────────────── */

const VAULT = [600, 380, 380, 380, 380, 380, 2800];

function VaultScene() {
  const { ref, step } = useSequence(VAULT);
  const items = [
    <div key="link" className="rounded-xl bg-surface p-3">
      <span className="flex items-center gap-1.5 text-[10.5px] text-ink-subtle">
        <span className="size-3 rounded-full bg-room-vault" /> calm.design
      </span>
      <p className="mt-1.5 text-[12px] leading-snug font-medium">Designing calm software</p>
    </div>,
    <div key="palette" className="overflow-hidden rounded-xl bg-surface">
      <div className="flex h-14">
        <span className="flex-1 bg-fern" />
        <span className="flex-1 bg-sage" />
        <span className="flex-1 bg-mint" />
        <span className="flex-1 bg-cream" />
        <span className="flex-1 bg-mist" />
      </div>
      <p className="px-3 py-2 text-[11px] text-ink-muted">Frosted Fern</p>
    </div>,
    <div key="image" className="h-28 rounded-xl bg-linear-to-br from-mint via-sage to-fern" />,
    <div key="code" className="rounded-xl bg-surface p-3 font-mono text-[10.5px] leading-relaxed">
      <p className="text-room-vault">export function</p>
      <p className="pl-3 text-ink-muted">Reveal()</p>
      <p className="pl-3 text-ink-subtle">{"{ … }"}</p>
    </div>,
    <div key="quote" className="rounded-xl bg-room-vault-soft p-3 text-[12px] leading-snug">
      “Make it calm, then make it fast.”
    </div>,
    <div key="file" className="flex items-center gap-2 rounded-xl bg-surface p-3 text-[12px]">
      <FileText className="size-4 text-room-vault" /> brand-brief.pdf
    </div>,
  ];
  const shown = Math.min(step, items.length);
  const columns = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];

  return (
    <SceneFrame ref={ref} id="vault" title="Vault · Inspiration">
      <div className="grid grid-cols-2 gap-2">
        {columns.map((col, c) => (
          <div key={c} className="flex flex-col gap-2">
            {col.map((item, j) => {
              const index = j * 2 + c;
              return (
                <AnimatePresence key={index} initial={false}>
                  {index < shown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={spring.bouncy}
                    >
                      {item}
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}
          </div>
        ))}
      </div>
    </SceneFrame>
  );
}
