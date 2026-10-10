import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { isRoomId, type RoomId } from "@/config/rooms";
import {
  DEFAULT_SETTINGS,
  WEEK_STARTS,
  type AccountSettings,
  type WeekStart,
} from "@/lib/settings";
import { requireUser } from "@/server/dal";
import { db } from "@/server/db";
import { userSettings } from "@/server/db/schema";

/** The signed-in user's account settings (defaults until they change one). Memoized per request. */
export const getSettings = cache(async (): Promise<AccountSettings> => {
  const user = await requireUser();
  const [row] = await db
    .select({
      weekStartsOn: userSettings.weekStartsOn,
      timeFormat: userSettings.timeFormat,
      focusMinutes: userSettings.focusMinutes,
      shortBreakMinutes: userSettings.shortBreakMinutes,
      longBreakMinutes: userSettings.longBreakMinutes,
      longBreakEvery: userSettings.longBreakEvery,
      autoStartFocus: userSettings.autoStartFocus,
      dailyFocusGoal: userSettings.dailyFocusGoal,
      startRoom: userSettings.startRoom,
      hiddenRooms: userSettings.hiddenRooms,
      captureProjectId: userSettings.captureProjectId,
      defaultStages: userSettings.defaultStages,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));
  if (!row) return DEFAULT_SETTINGS;
  const weekStartsOn = (WEEK_STARTS as number[]).includes(row.weekStartsOn)
    ? (row.weekStartsOn as WeekStart)
    : DEFAULT_SETTINGS.weekStartsOn;
  const startRoom = isRoomId(row.startRoom) ? row.startRoom : DEFAULT_SETTINGS.startRoom;
  return {
    ...row,
    weekStartsOn,
    startRoom,
    hiddenRooms: row.hiddenRooms.filter((id): id is RoomId => isRoomId(id) && id !== startRoom),
    defaultStages:
      row.defaultStages.length > 0 ? row.defaultStages : DEFAULT_SETTINGS.defaultStages,
  };
});
