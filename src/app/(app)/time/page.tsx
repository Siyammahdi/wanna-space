import type { Metadata } from "next";

import { RoomHeader } from "@/components/shell/room-header";
import { listTaskChoices } from "@/features/tasks/server/queries";
import { DaySummary } from "@/features/time/components/day-summary";
import { EntryList } from "@/features/time/components/entry-list";
import { FocusTimer } from "@/features/time/components/focus-timer";
import { LogTime } from "@/features/time/components/log-time";
import { WeekReport } from "@/features/time/components/week-report";
import { listEntries } from "@/features/time/server/queries";
import { addDays } from "@/lib/dates";
import { startOfWeek, weekFromParam } from "@/lib/week";
import { getSettings } from "@/server/settings";
import { getUserToday } from "@/server/today";

export const metadata: Metadata = { title: "Time" };

export default async function TimePage({ searchParams }: PageProps<"/time">) {
  const [today, { weekStartsOn, timeFormat, dailyFocusGoal }, { week }] = await Promise.all([
    getUserToday(),
    getSettings(),
    searchParams,
  ]);
  const start = weekFromParam(week, today, weekStartsOn);
  const end = addDays(start, 6);
  const todayInWeek = today >= start && today <= end;
  const [entries, otherToday, choices] = await Promise.all([
    listEntries(start, end),
    todayInWeek ? null : listEntries(today, today),
    listTaskChoices(),
  ]);
  const todayEntries = otherToday ?? entries.filter((e) => e.date === today);

  return (
    <>
      <RoomHeader roomId="time" actions={<LogTime choices={choices} today={today} />} />
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:[grid-template-areas:'timer_today'_'timer_week'_'sessions_week']">
        <div className="md:[grid-area:timer]">
          <FocusTimer choices={choices} />
        </div>
        <div className="md:[grid-area:today]">
          <DaySummary entries={todayEntries} timeFormat={timeFormat} goal={dailyFocusGoal} />
        </div>
        <div className="md:[grid-area:week]">
          <WeekReport
            entries={entries}
            start={start}
            today={today}
            currentWeek={startOfWeek(today, weekStartsOn)}
          />
        </div>
        <div className="md:[grid-area:sessions]">
          <EntryList entries={entries} today={today} />
        </div>
      </div>
    </>
  );
}
