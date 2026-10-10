import { Archive, CalendarDays, Check, NotebookPen, Search, Timer } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";

const TODAY = [
  {
    title: "Send the launch brief to Rafi",
    meta: "Launch plan",
    tone: "bg-room-orbit",
    done: true,
  },
  { title: "Review the landing copy", meta: "Due 2:00 pm", tone: "bg-room-today", done: false },
  { title: "Pay the studio rent", meta: "Home · P1", tone: "bg-room-tasks", done: false },
];

const WEEK = [38, 62, 80, 54, 92, 26, 12];

const NEXT = [
  {
    label: "Planner",
    icon: CalendarDays,
    title: "Tomorrow: 3 tasks, 2h blocked",
    meta: "Next up: client call",
    tone: "bg-room-planner-soft/70",
    ink: "text-room-planner",
  },
  {
    label: "Notes",
    icon: NotebookPen,
    title: "Launch week",
    meta: "Edited 2 minutes ago",
    tone: "bg-room-notes-soft/70",
    ink: "text-room-notes",
  },
  {
    label: "Vault",
    icon: Archive,
    title: "4 things saved this week",
    meta: "Latest: Frosted Fern palette",
    tone: "bg-room-vault-soft/70",
    ink: "text-room-vault",
  },
];

/** A still of the Today room, drawn with the real tokens. Decorative. */
export function AppWindow() {
  return (
    <div
      role="img"
      aria-label="Wanna Space: the Today room, with the rooms in the sidebar, today's tasks, a focus timer and the week's focus time"
      className="overflow-hidden rounded-2xl bg-surface-raised shadow-xl"
    >
      <div aria-hidden className="flex h-10 items-center gap-1.5 bg-surface-sunken/70 px-4">
        <span className="size-2.5 rounded-full bg-ink-faint/50" />
        <span className="size-2.5 rounded-full bg-ink-faint/50" />
        <span className="size-2.5 rounded-full bg-ink-faint/50" />
        <span className="mx-auto flex h-6 w-56 items-center justify-center rounded-md bg-surface/80 text-[11px] text-ink-subtle">
          wannaspace.app/today
        </span>
      </div>

      <div aria-hidden className="flex">
        <aside className="hidden w-48 shrink-0 flex-col gap-0.5 bg-surface-sunken/50 p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-1.5">
            <LogoMark className="size-5" />
            <span className="font-heading text-[13px] font-bold tracking-tight">Wanna Space</span>
          </div>
          <div className="mb-3 flex h-7 items-center gap-2 rounded-md bg-surface/70 px-2 text-[11px] text-ink-faint">
            <Search className="size-3" />
            Search
          </div>
          {rooms.map((room) => {
            const Icon = room.icon;
            const active = room.id === "today";
            return (
              <span
                key={room.id}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-md px-2 text-[12px]",
                  active ? "bg-surface-raised font-medium text-ink" : "text-ink-muted",
                )}
              >
                <Icon className={cn("size-3.5", room.tone.text)} strokeWidth={1.9} />
                {room.label}
              </span>
            );
          })}
        </aside>

        <div className="min-w-0 flex-1 p-5 sm:p-7">
          <p className="text-[11px] font-medium text-ink-subtle">Friday, October 9</p>
          <p className="mt-1 font-heading text-[22px] font-semibold tracking-[-0.03em] sm:text-[28px]">
            Good morning, Maya.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl bg-surface p-3.5">
              <p className="mb-2 text-[11px] font-medium text-ink-subtle">Due today</p>
              <ul className="flex flex-col gap-1">
                {TODAY.map((t) => (
                  <li key={t.title} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full",
                        t.done ? "bg-room-tasks" : "ring-[1.5px] ring-line-strong ring-inset",
                      )}
                    >
                      {t.done && (
                        <Check className="size-2.5 text-accent-contrast" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[12.5px]",
                          t.done ? "text-ink-subtle line-through" : "text-ink",
                        )}
                      >
                        {t.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10.5px] text-ink-subtle">
                        <span className={cn("size-1.5 rounded-full", t.tone)} />
                        {t.meta}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-room-time-soft/70 p-3.5">
                <svg viewBox="0 0 40 40" className="size-11 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="fill-none stroke-surface"
                    strokeWidth="4"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset="34"
                    strokeLinecap="round"
                    className="fill-none stroke-room-time"
                    strokeWidth="4"
                  />
                </svg>
                <div>
                  <p className="flex items-center gap-1 text-[10.5px] font-medium text-room-time">
                    <Timer className="size-3" /> Focus
                  </p>
                  <p className="font-heading text-[20px] font-semibold tabular-nums">16:24</p>
                </div>
              </div>
              <div className="rounded-xl bg-surface p-3.5">
                <p className="text-[11px] font-medium text-ink-subtle">This week · 14h 20m</p>
                <div className="mt-2.5 flex h-14 items-end gap-1.5">
                  {WEEK.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%`, animationDelay: `${600 + i * 60}ms` }}
                      className={cn(
                        "flex-1 origin-bottom animate-grow rounded-[3px]",
                        i === 4 ? "bg-room-time" : "bg-room-time/35",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-3">
            {NEXT.map((card) => (
              <div key={card.label} className={cn("rounded-xl p-3.5", card.tone)}>
                <p className={cn("flex items-center gap-1 text-[10.5px] font-medium", card.ink)}>
                  <card.icon className="size-3" /> {card.label}
                </p>
                <p className="mt-1 truncate text-[12.5px] text-ink">{card.title}</p>
                <p className="text-[10.5px] text-ink-subtle">{card.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
