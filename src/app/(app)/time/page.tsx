import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { RoomPlaceholder } from "@/components/shell/room-placeholder";

export const metadata: Metadata = { title: "Time" };

export default function TimePage() {
  return (
    <RoomTransition>
      <RoomHeader roomId="time" />
      <RoomPlaceholder
        roomId="time"
        plans={[
          "Focus sessions (pomodoro or free-form) attached to a task",
          "Time tracking with a running timer that survives reloads",
          "Daily and weekly breakdown by project and tag",
          "Gentle break reminders",
        ]}
      />
    </RoomTransition>
  );
}
