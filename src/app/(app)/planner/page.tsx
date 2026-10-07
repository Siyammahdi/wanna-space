import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { RoomPlaceholder } from "@/components/shell/room-placeholder";

export const metadata: Metadata = { title: "Planner" };

export default function PlannerPage() {
  return (
    <RoomTransition>
      <RoomHeader roomId="planner" />
      <RoomPlaceholder
        roomId="planner"
        plans={[
          "Week and day views with time blocks",
          "Drag tasks from your lists onto the calendar",
          "Daily planning ritual: pick today’s top three",
          "Weekly review that shows what moved and what slipped",
        ]}
      />
    </RoomTransition>
  );
}
