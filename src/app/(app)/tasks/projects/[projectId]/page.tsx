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
  const project = await getProject(projectId);
  if (!project) notFound();

  const scope: TaskScope = { kind: "project", id: project.id };
  const [open, completed, projects, today] = await Promise.all([
    listOpenTasks(scope),
    listRecentlyCompleted(scope),
    listProjects(),
    getUserToday(),
  ]);

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
