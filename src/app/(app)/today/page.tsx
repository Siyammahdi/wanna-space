import type { Metadata } from "next";
import { CalendarDays, ListChecks, Timer } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { RoomTransition } from "@/components/motion/room-transition";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

import { GettingStarted } from "./_components/getting-started";
import { Greeting } from "./_components/greeting";

export const metadata: Metadata = { title: "Today" };

const lanes = [
  {
    title: "Due today",
    empty: "Nothing due. Tasks you schedule for today will gather here.",
    icon: ListChecks,
    tone: "text-room-tasks bg-room-tasks-soft",
  },
  {
    title: "Schedule",
    empty: "Your time blocks and events for the day will line up here.",
    icon: CalendarDays,
    tone: "text-room-planner bg-room-planner-soft",
  },
  {
    title: "Focus",
    empty: "Start a focus session and watch your hours add up.",
    icon: Timer,
    tone: "text-room-time bg-room-time-soft",
  },
];

export default function TodayPage() {
  return (
    <RoomTransition>
      <div className="flex flex-col gap-8">
        <Reveal>
          <Greeting />
        </Reveal>

        <Reveal order={1}>
          <GettingStarted />
        </Reveal>

        <Reveal order={2} className="grid gap-4 md:grid-cols-3">
          {lanes.map(({ title, empty, icon: Icon, tone }) => (
            <Card key={title} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex size-7 items-center justify-center rounded-sm", tone)}>
                  <Icon className="size-4" />
                </span>
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-subtle">{empty}</p>
            </Card>
          ))}
        </Reveal>
      </div>
    </RoomTransition>
  );
}
