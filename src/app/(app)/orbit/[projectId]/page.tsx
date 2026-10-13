import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoomTransition } from "@/components/motion/room-transition";
import { OrbitBoard } from "@/features/orbit/components/orbit-board";
import { getOrbitProject } from "@/features/orbit/server/queries";
import {
  getProject,
  listOpenTasks,
  listProjects,
  listRecentlyCompleted,
} from "@/features/tasks/server/queries";
import { isUuid } from "@/lib/id";
import { getUserToday } from "@/server/today";

export async function generateMetadata({
  params,
}: PageProps<"/orbit/[projectId]">): Promise<Metadata> {
  const project = await getProject((await params).projectId);
  return { title: project ? `${project.name} · Orbit` : "Orbit" };
}

export default async function OrbitBoardPage({
  params,
  searchParams,
}: PageProps<"/orbit/[projectId]">) {
  const [{ projectId }, { task }, today] = await Promise.all([
    params,
    searchParams,
    getUserToday(),
  ]);
  if (!isUuid(projectId)) notFound();

  // One round: the task lists are space-scoped, so a stranger's id just finds nothing.
  const scope = { kind: "project", id: projectId } as const;
  const [board, open, completed, inbox, projects] = await Promise.all([
    getOrbitProject(projectId, today),
    listOpenTasks(scope),
    listRecentlyCompleted(scope, 50),
    listOpenTasks({ kind: "inbox" }),
    listProjects(),
  ]);
  if (!board) notFound();

  return (
    <RoomTransition>
      {/* A board needs the room's full width. */}
      <div data-wide>
        <OrbitBoard
          key={projectId}
          project={board.summary}
          stages={board.stages}
          tasks={[...open, ...completed, ...inbox]}
          projects={projects}
          today={today}
          doneTotal={board.summary.done}
          openTaskId={typeof task === "string" ? task : null}
        />
      </div>
    </RoomTransition>
  );
}
