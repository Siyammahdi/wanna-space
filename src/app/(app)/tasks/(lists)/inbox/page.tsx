import type { Metadata } from "next";

import { TaskBoard } from "@/features/tasks/components/task-board";
import type { TaskScope } from "@/features/tasks/schema";
import {
  listOpenTasks,
  listProjects,
  listRecentlyCompleted,
} from "@/features/tasks/server/queries";
import { getUserToday } from "@/server/today";

export const metadata: Metadata = { title: "Inbox · Tasks" };

const scope: TaskScope = { kind: "inbox" };

export default async function InboxPage({ searchParams }: PageProps<"/tasks/inbox">) {
  const [open, completed, projects, today, { task }] = await Promise.all([
    listOpenTasks(scope),
    listRecentlyCompleted(scope),
    listProjects(),
    getUserToday(),
    searchParams,
  ]);

  return (
    <TaskBoard
      open={open}
      completed={completed}
      projects={projects}
      scope={scope}
      today={today}
      openTaskId={typeof task === "string" ? task : null}
    />
  );
}
