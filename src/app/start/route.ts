import { redirect } from "next/navigation";

import { getRoom } from "@/config/rooms";
import { getSettings } from "@/server/settings";

/** "Open my space": the room chosen in Settings → General (signed out → sign-in). */
export async function GET() {
  const { startRoom } = await getSettings();
  redirect(getRoom(startRoom).href);
}
