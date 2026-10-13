import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";

/** No data here: everything above loading.tsx is prefetched, and must not go stale. */
export default function TasksLayout({ children }: LayoutProps<"/tasks">) {
  return (
    <RoomTransition>
      <div className="mx-auto max-w-3xl">
        <RoomHeader roomId="tasks" />
        {children}
      </div>
    </RoomTransition>
  );
}
