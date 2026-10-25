import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/sessionOptions";
import type { SessionData } from "@/lib/auth";

const ACTIVITY_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const res = NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/_next")) return res;

  const session = await getIronSession<SessionData>(req, res, getSessionOptions());
  const user = session.user;
  if (!user) return res;

  const last = user.lastActiveTouchAt ? Date.parse(user.lastActiveTouchAt) : 0;
  if (Date.now() - last < ACTIVITY_TOUCH_INTERVAL_MS) return res;

  user.lastActiveTouchAt = new Date().toISOString();
  await session.save();

  event.waitUntil(
    import("@/lib/airtable")
      .then(({ touchActivity }) =>
        touchActivity({
          email: user.email,
          name: user.name,
          slackId: user.slackId,
          address: user.address,
        })
      )
      .catch((err) => console.error("[middleware] touchActivity failed:", err))
  );

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
