import { ProjectNav } from "@/features/tasks/components/project-nav";
import { countInbox, listProjects } from "@/features/tasks/server/queries";

/** The list switcher stays mounted while you move between All, Inbox and projects. */
export default async function TaskListsLayout({ children }: { children: React.ReactNode }) {
  const [projects, inboxCount] = await Promise.all([listProjects(), countInbox()]);

  return (
    <>
      <ProjectNav projects={projects} inboxCount={inboxCount} />
      {children}
    </>
  );
}
