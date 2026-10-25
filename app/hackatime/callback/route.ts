import { NextRequest, NextResponse } from "next/server";
import { getHackatimeUserId, hackatimeExchangeCode } from "@/lib/hackatime";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { callbackUrl, configuredUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code)
    return NextResponse.redirect(new URL("/submit?hackatime_error=no_code", req.url));

  const cookieStore = await cookies();
  const savedState = cookieStore.get("hackatime_oauth_state")?.value;
  cookieStore.delete("hackatime_oauth_state");

  if (!savedState || savedState !== state)
    return NextResponse.redirect(new URL("/submit?hackatime_error=invalid_state", req.url));

  const session = await getSession();
  if (!session.user)
    return NextResponse.redirect(new URL("/submit?error=no_code", req.url));

  try {
    const redirectUri =
      configuredUrl(process.env.HACKATIME_REDIRECT_URI) ??
      callbackUrl(req.url, "/hackatime/callback");
    const token = await hackatimeExchangeCode(code, redirectUri);
    const hackatimeUserId = await getHackatimeUserId(token);
    session.hackatimeToken = token;
    session.hackatimeUserId = hackatimeUserId;
    await session.save();
    return NextResponse.redirect(new URL("/submit", req.url));
  } catch (err) {
    console.error("[hackatime/callback] error:", err);
    return NextResponse.redirect(new URL("/submit?hackatime_error=auth_failed", req.url));
  }
}
