import { RoomLoading } from "@/components/shell/room-loading";
import { TreeOverviewSkeleton } from "@/features/notes/components/notes-skeleton";

export default function NotesOverviewLoading() {
  return (
    <RoomLoading label="notes">
      <TreeOverviewSkeleton />
    </RoomLoading>
  );
}
