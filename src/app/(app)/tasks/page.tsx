import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { RoomPlaceholder } from "@/components/shell/room-placeholder";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <RoomTransition>
      <RoomHeader roomId="tasks" />
      <RoomPlaceholder
        roomId="tasks"
        plans={[
          "Quick capture from anywhere with natural dates (“call mom fri 5pm”)",
          "Inbox, Today, Upcoming and project lists",
          "Priorities, tags, subtasks and recurring tasks",
          "Keyboard-first: create, complete and reorder without the mouse",
        ]}
      />
    </RoomTransition>
  );
}
