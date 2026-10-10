"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { ROOM_IDS } from "@/config/rooms";
import { STAGE_LIMITS, TIMER_LIMITS } from "@/lib/settings";
import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, userSettings } from "@/server/db/schema";
import { getSettings } from "@/server/settings";

const inRange = ([min, max]: readonly [number, number]) => z.number().int().min(min).max(max);
const roomId = z.enum(ROOM_IDS);

const updateSettingsInput = z
  .object({
    weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
    timeFormat: z.enum(["12h", "24h"]),
    focusMinutes: inRange(TIMER_LIMITS.focusMinutes),
    shortBreakMinutes: inRange(TIMER_LIMITS.shortBreakMinutes),
    longBreakMinutes: inRange(TIMER_LIMITS.longBreakMinutes),
    longBreakEvery: inRange(TIMER_LIMITS.longBreakEvery),
    autoStartFocus: z.boolean(),
    dailyFocusGoal: inRange(TIMER_LIMITS.dailyFocusGoal),
    startRoom: roomId,
    hiddenRooms: z.array(roomId).max(ROOM_IDS.length),
    captureProjectId: z.uuid().nullable(),
    defaultStages: z
      .array(z.string().trim().min(1).max(STAGE_LIMITS.nameLength))
      .min(1, "Keep at least one stage")
      .max(STAGE_LIMITS.count),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0);

export type UpdateSettingsInput = z.input<typeof updateSettingsInput>;

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateSettingsInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That setting didn’t look right.",
    };
  }
  const { user, space } = await requireSpace();
  const patch = parsed.data;

  if (patch.captureProjectId) {
    const [owned] = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, patch.captureProjectId), eq(project.spaceId, space.id)));
    if (!owned) return { ok: false, error: "That project no longer exists." };
  }
  if (patch.hiddenRooms || patch.startRoom) {
    const current = await getSettings();
    const start = patch.startRoom ?? current.startRoom;
    const hidden = patch.hiddenRooms ?? current.hiddenRooms;
    if (hidden.includes(start)) {
      return { ok: false, error: "The room you start in can’t be hidden." };
    }
  }

  await db
    .insert(userSettings)
    .values({ userId: user.id, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });

  refresh();
  return { ok: true };
}
