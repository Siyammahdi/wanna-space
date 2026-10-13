import { RoomHeader } from "@/components/shell/room-header";
import { RoomLoading } from "@/components/shell/room-loading";
import { LogTimeSkeleton, TimeSkeleton } from "@/features/time/components/time-skeleton";

export default function TimeLoading() {
  return (
    <RoomLoading label="time">
      <RoomHeader roomId="time" actions={<LogTimeSkeleton />} />
      <TimeSkeleton />
    </RoomLoading>
  );
}
