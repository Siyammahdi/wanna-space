import type { Metadata } from "next";

import { listRecentPages } from "@/features/notes/server/queries";
import { listOrbitProjects } from "@/features/orbit/server/queries";
import {
  countDueOn,
  listProjects,
  listTaskChoices,
  listTodayTasks,
} from "@/features/tasks/server/queries";
import { listEntries } from "@/features/time/server/queries";
import { getDayPlan } from "@/features/today/server/queries";
import { listRecentVaultItems } from "@/features/vault/server/queries";
import { addDays } from "@/lib/dates";
import { requireUser } from "@/server/dal";
import { getUserToday } from "@/server/today";

import { ProjectsCard } from "./_components/projects-card";
import { NotesCard, VaultCard } from "./_components/room-cards";
import { TodayBoard } from "./_components/today-board";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const [user, today] = await Promise.all([requireUser(), getUserToday()]);
  // Only today's list waits on the plan (its picks); everything else loads alongside it.
  const planned = getDayPlan(today);
  const [plan, tasks, projects, choices, entries, tomorrow, orbit, pages, saves] =
    await Promise.all([
      planned,
      planned.then((p) => listTodayTasks(today, p.focus)),
      listProjects(),
      listTaskChoices({ topLevel: true }),
      listEntries(today, today),
      countDueOn(addDays(today, 1)),
      listOrbitProjects(today),
      listRecentPages(3),
      listRecentVaultItems(3),
    ]);

  return (
    <TodayBoard
      name={user.name}
      today={today}
      tasks={tasks}
      projects={projects}
      choices={choices}
      plan={plan}
      entries={entries}
      tomorrow={tomorrow}
      rooms={
        <>
          <ProjectsCard projects={orbit} today={today} />
          <NotesCard pages={pages} />
          <VaultCard saves={saves} />
        </>
      }
    />
  );
}
