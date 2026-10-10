import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/server/auth";
import { ensurePersonalSpace } from "@/server/spaces";

/**
 * Data access layer. Every read and write of user data starts here — proxy.ts
 * only does optimistic redirects and is never the security boundary.
 * Memoized per request with React cache().
 */

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** For auth pages: a valid session means there's nothing to do here. */
export async function redirectIfSignedIn(to: "/start" = "/start") {
  if (await getSession()) redirect(to);
}

/** The signed-in user, or a redirect to sign-in. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id, name, email, image, emailVerified } = session.user;
  return { id, name, email, image: image ?? null, emailVerified };
});

/** The signed-in user plus the space all their data is scoped to. */
export const requireSpace = cache(async () => {
  const user = await requireUser();
  const space = await ensurePersonalSpace(user.id, user.name);
  return { user, space };
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
