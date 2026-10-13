import type { Metadata } from "next";

import { RoomHeader } from "@/components/shell/room-header";
import { OrbitOverview } from "@/features/orbit/components/orbit-overview";
import { listOrbitProjects } from "@/features/orbit/server/queries";
import { getUserToday } from "@/server/today";

export const metadata: Metadata = { title: "Orbit" };

export default async function OrbitPage() {
  const today = await getUserToday();
  const projects = await listOrbitProjects(today);

  return (
    <div data-wide>
      <RoomHeader roomId="orbit" />
      <OrbitOverview projects={projects} today={today} />
    </div>
  );
}
