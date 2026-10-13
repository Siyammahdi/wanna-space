import { RoomHeader } from "@/components/shell/room-header";
import { RoomLoading } from "@/components/shell/room-loading";
import { OverviewSkeleton } from "@/features/orbit/components/orbit-skeleton";

export default function OrbitLoading() {
  return (
    <RoomLoading label="orbit" wide>
      <RoomHeader roomId="orbit" />
      <OverviewSkeleton />
    </RoomLoading>
  );
}
