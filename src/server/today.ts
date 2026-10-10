import "server-only";

import { cookies } from "next/headers";

import { isValidTimeZone, TIME_ZONE_COOKIE, todayIn } from "@/lib/dates";

/** The user's time zone (cookie set by the browser), UTC until known. */
export async function getUserTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : "UTC";
}

/** "Today" in the user's own time zone. */
export async function getUserToday() {
  return todayIn(await getUserTimeZone());
}
