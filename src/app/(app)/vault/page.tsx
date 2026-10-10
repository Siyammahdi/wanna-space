import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { RoomTransition } from "@/components/motion/room-transition";
import { RoomHeader } from "@/components/shell/room-header";
import { SaveBar } from "@/features/vault/components/save-bar";
import { VaultBoard, VaultOverlays } from "@/features/vault/components/vault-board";
import { VaultProvider } from "@/features/vault/components/vault-provider";
import { VaultToolbar } from "@/features/vault/components/vault-toolbar";
import { filtersFromParams } from "@/features/vault/filters";
import { listVaultCollections, listVaultItems, VAULT_LIMIT } from "@/features/vault/server/queries";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Vault" };

export default async function VaultPage({ searchParams }: PageProps<"/vault">) {
  const [items, collections, params] = await Promise.all([
    listVaultItems(),
    listVaultCollections(),
    searchParams,
  ]);

  return (
    <RoomTransition>
      {/* Opts out of the app's reading width: a board wants the room. */}
      <div data-wide>
        <VaultProvider
          initialItems={items}
          initialCollections={collections}
          initialFilters={filtersFromParams(params)}
          uploadsEnabled={features.uploads}
          linkedId={typeof params.item === "string" ? params.item : null}
        >
          <RoomHeader roomId="vault" />
          <Reveal>
            <SaveBar />
          </Reveal>
          <Reveal order={1}>
            <VaultToolbar />
          </Reveal>
          <Reveal order={2}>
            <VaultBoard limited={items.length >= VAULT_LIMIT} />
          </Reveal>
          <VaultOverlays />
        </VaultProvider>
      </div>
    </RoomTransition>
  );
}
