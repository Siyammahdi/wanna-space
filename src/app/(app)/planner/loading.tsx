import { RoomHeader } from "@/components/shell/room-header";
import { RoomLoading } from "@/components/shell/room-loading";
import { WeekSkeleton } from "@/features/planner/components/week-skeleton";

export default function PlannerLoading() {
  return (
    <RoomLoading label="planner" wide>
      <RoomHeader roomId="planner" />
      <WeekSkeleton />
    </RoomLoading>
  );
}
