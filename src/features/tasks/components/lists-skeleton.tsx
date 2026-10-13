"use client";

import { usePathname } from "next/navigation";

import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";

import { ProjectHeader } from "./project-header";
import { useShellProjects } from "./shell-projects";
import { TaskBoardSkeleton } from "./task-skeleton";

/**
 * A list loading. A project's page also gets its header: the real one when the shell knows
 * the project, its shape otherwise.
 */
export function TaskListsSkeleton() {
  const pathname = usePathname();
  const projects = useShellProjects();
  const id = pathname.match(/^\/tasks\/projects\/([^/]+)/)?.[1];
  const project = id ? projects.find((p) => p.id === id) : undefined;
  return (
    <>
      {project ? (
        <ProjectHeader project={project} />
      ) : (
        id && (
          <div aria-hidden className="mb-5 flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <SkeletonLine className="h-[33px] flex-1 px-2" bar="h-5 w-40" />
            <Skeleton className="h-8 w-[76px]" />
            <Skeleton className="size-8" />
          </div>
        )
      )}
      <TaskBoardSkeleton />
    </>
  );
}
