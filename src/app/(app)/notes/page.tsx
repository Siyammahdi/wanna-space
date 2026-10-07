import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { RoomPlaceholder } from "@/components/shell/room-placeholder";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <RoomTransition>
      <RoomHeader roomId="notes" />
      <RoomPlaceholder
        roomId="notes"
        plans={[
          "Block editor with slash commands, headings, lists, code and embeds",
          "Nested pages and a calm page tree",
          "Link notes to tasks, vault items and days",
          "Daily journal page that opens with today’s context",
        ]}
      />
    </RoomTransition>
  );
}
