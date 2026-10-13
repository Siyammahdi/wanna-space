"use client";

import { createContext, use, type ReactNode } from "react";

import type { ProjectItem } from "../schema";

const ShellProjectsContext = createContext<ProjectItem[]>([]);

/**
 * The projects the app shell already loads (for the command palette), shared so loading
 * states can draw the real project nav and headers before a room's own data arrives.
 */
export function ShellProjectsProvider({
  projects,
  children,
}: {
  projects: ProjectItem[];
  children: ReactNode;
}) {
  return <ShellProjectsContext value={projects}>{children}</ShellProjectsContext>;
}

export const useShellProjects = () => use(ShellProjectsContext);
