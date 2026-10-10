import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { WeekBoard } from "@/features/planner/components/week-board";
import { WeekNav } from "@/features/planner/components/week-nav";
import { weekFromParam } from "@/features/planner/week";
import { listPlannerTasks, listProjects } from "@/features/tasks/server/queries";
import { addDays } from "@/lib/dates";
import { getSettings } from "@/server/settings";
import { getUserToday } from "@/server/today";

export const metadata: Metadata = { title: "Planner" };

export default async function PlannerPage({ searchParams }: PageProps<"/planner">) {
  const [today, { weekStartsOn }, { week }] = await Promise.all([
    getUserToday(),
    getSettings(),
    searchParams,
  ]);
  const start = weekFromParam(week, today, weekStartsOn);
  const [tasks, projects] = await Promise.all([
    listPlannerTasks(start, addDays(start, 6), today),
    listProjects(),
  ]);

  return (
    <RoomTransition>
      {/* Opts out of the app's reading width: a week needs the room. */}
      <div data-wide>
        <RoomHeader roomId="planner" />
        <WeekBoard
          key={start}
          tasks={tasks}
          today={today}
          weekStart={start}
          projects={projects}
          nav={<WeekNav start={start} today={today} weekStartsOn={weekStartsOn} />}
        />
      </div>
    </RoomTransition>
  );
}
