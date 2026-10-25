import { NextRequest, NextResponse } from "next/server";
import { hackclubAuthorizeUrl } from "@/lib/auth";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { callbackUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  const returnTo = req.nextUrl.searchParams.get("returnTo");
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    cookieStore.set("oauth_return_to", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const redirectUri = callbackUrl(req.url, "/oauth/callback");
  const url = hackclubAuthorizeUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
