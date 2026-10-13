import { RoomHeader } from "@/components/shell/room-header";
import { RoomLoading } from "@/components/shell/room-loading";
import { VaultSkeleton } from "@/features/vault/components/vault-skeleton";

export default function VaultLoading() {
  return (
    <RoomLoading label="vault" wide>
      <RoomHeader roomId="vault" />
      <VaultSkeleton />
    </RoomLoading>
  );
}
