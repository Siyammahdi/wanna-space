import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { ProjectNav } from "@/features/tasks/components/project-nav";
import { countInbox, listProjects } from "@/features/tasks/server/queries";

export default async function TasksLayout({ children }: LayoutProps<"/tasks">) {
  const [projects, inboxCount] = await Promise.all([listProjects(), countInbox()]);

  return (
    <RoomTransition>
      <div className="mx-auto max-w-3xl">
        <RoomHeader roomId="tasks" />
        <ProjectNav projects={projects} inboxCount={inboxCount} />
        {children}
      </div>
    </RoomTransition>
  );
}
