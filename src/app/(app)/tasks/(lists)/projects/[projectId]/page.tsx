import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectHeader } from "@/features/tasks/components/project-header";
import { TaskBoard } from "@/features/tasks/components/task-board";
import type { TaskScope } from "@/features/tasks/schema";
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
}: PageProps<"/tasks/projects/[projectId]">): Promise<Metadata> {
  const project = await getProject((await params).projectId);
  return { title: project ? `${project.name} · Tasks` : "Tasks" };
}

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/tasks/projects/[projectId]">) {
  const [{ projectId }, { task }] = await Promise.all([params, searchParams]);
  if (!isUuid(projectId)) notFound();

  // Everything in one round: the lists are space-scoped, so a stranger's id just finds nothing.
  const scope: TaskScope = { kind: "project", id: projectId };
  const [project, open, completed, projects, today] = await Promise.all([
    getProject(projectId),
    listOpenTasks(scope),
    listRecentlyCompleted(scope),
    listProjects(),
    getUserToday(),
  ]);
  if (!project) notFound();

  return (
    <>
      <ProjectHeader key={`header-${project.id}`} project={project} />
      <TaskBoard
        key={`board-${project.id}`}
        open={open}
        completed={completed}
        projects={projects}
        scope={scope}
        today={today}
        openTaskId={typeof task === "string" ? task : null}
      />
    </>
  );
}
