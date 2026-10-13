import { RoomLoading } from "@/components/shell/room-loading";
import { TaskListsSkeleton } from "@/features/tasks/components/lists-skeleton";

export default function TaskListLoading() {
  return (
    <RoomLoading label="tasks">
      <TaskListsSkeleton />
    </RoomLoading>
  );
}
