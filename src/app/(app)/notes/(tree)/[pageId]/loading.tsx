import { RoomLoading } from "@/components/shell/room-loading";
import { PageSkeleton } from "@/features/notes/components/notes-skeleton";

export default function NotePageLoading() {
  return (
    <RoomLoading label="page">
      <PageSkeleton />
    </RoomLoading>
  );
}
