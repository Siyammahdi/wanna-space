import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { space, spaceMember } from "@/server/db/schema";

export type SpaceSummary = { id: string; name: string };

/**
 * Returns the user's personal space, creating it if missing. Called from the
 * sign-up hook and again by the DAL so a failed hook self-heals on next visit.
 */
export async function ensurePersonalSpace(
  userId: string,
  userName?: string,
): Promise<SpaceSummary> {
  const existing = await db
    .select({ id: space.id, name: space.name })
    .from(spaceMember)
    .innerJoin(space, eq(space.id, spaceMember.spaceId))
    .where(eq(spaceMember.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const firstName = userName?.trim().split(/\s+/)[0];
  const name = firstName ? `${firstName}’s space` : "My space";

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(space)
      .values({ name, kind: "personal" })
      .returning({ id: space.id, name: space.name });
    await tx.insert(spaceMember).values({ spaceId: created.id, userId, role: "owner" });
    return created;
  });
}
