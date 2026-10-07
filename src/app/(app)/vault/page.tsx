import type { Metadata } from "next";

import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { RoomPlaceholder } from "@/components/shell/room-placeholder";

export const metadata: Metadata = { title: "Vault" };

export default function VaultPage() {
  return (
    <RoomTransition>
      <RoomHeader roomId="vault" />
      <RoomPlaceholder
        roomId="vault"
        plans={[
          "Save a link and get a preview card with screenshot, title and colors",
          "Drop in images, design files, code snippets and components",
          "Collections and tags, masonry board view",
          "Full-text search across everything you’ve kept",
        ]}
      />
    </RoomTransition>
  );
}
