import { RoomLoading } from "@/components/shell/room-loading";
import { BoardSkeleton } from "@/features/orbit/components/orbit-skeleton";

export default function BoardLoading() {
  return (
    <RoomLoading label="board" wide>
      <BoardSkeleton />
    </RoomLoading>
  );
}
