import { NextRequest, NextResponse } from "next/server";
import { hackatimeAuthorizeUrl } from "@/lib/hackatime";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { callbackUrl, configuredUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("hackatime_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  const redirectUri =
    configuredUrl(process.env.HACKATIME_REDIRECT_URI) ??
    callbackUrl(req.url, "/hackatime/callback");
  return NextResponse.redirect(hackatimeAuthorizeUrl(state, redirectUri));
}
