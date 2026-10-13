import { RoomLoading } from "@/components/shell/room-loading";
import { TaskListsSkeleton } from "@/features/tasks/components/lists-skeleton";
import { ProjectNavSkeleton } from "@/features/tasks/components/project-nav";

export default function TasksLoading() {
  return (
    <RoomLoading label="tasks">
      <ProjectNavSkeleton />
      <TaskListsSkeleton />
    </RoomLoading>
  );
}
