import { RoomLoading } from "@/components/shell/room-loading";
import { NotesRoomSkeleton, TreeSkeleton } from "@/features/notes/components/notes-skeleton";

import { NotesFrame } from "./_components/notes-frame";

export default function NotesLoading() {
  return (
    <RoomLoading label="notes" wide>
      <NotesFrame tree={<TreeSkeleton />}>
        <NotesRoomSkeleton />
      </NotesFrame>
    </RoomLoading>
  );
}
