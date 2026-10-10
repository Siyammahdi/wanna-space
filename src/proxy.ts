import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { rooms } from "@/config/rooms";

/**
 * Optimistic redirect to sign-in when no session cookie exists (no DB call).
 * Real authorization happens in src/server/dal.ts. Signed-in users are bounced
 * off auth pages by the (auth) layout instead, which checks the session for
 * real — a stale cookie here would otherwise cause a redirect loop.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isRoom = rooms.some((r) => pathname === r.href || pathname.startsWith(`${r.href}/`));

  if (isRoom && !getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
