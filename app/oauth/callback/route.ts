import { NextRequest, NextResponse, after } from "next/server";
import { exchangeCode, getHackclubUser, getSession } from "@/lib/auth";
import { recordLogin } from "@/lib/airtable";
import { cookies } from "next/headers";
import { callbackUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code)
    return NextResponse.redirect(new URL("/submit?error=no_code", req.url));

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");

  if (!savedState || savedState !== state)
    return NextResponse.redirect(
      new URL("/submit?error=invalid_state", req.url)
  );

  try {
    const redirectUri = callbackUrl(req.url, "/oauth/callback");
    const { access_token } = await exchangeCode(code, redirectUri);
    const hcUser = await getHackclubUser(access_token);

    const session = await getSession();
    session.user = {
      id: String(hcUser.id),
      email: hcUser.email,
      name: hcUser.name ?? hcUser.username ?? hcUser.email,
      slackId: hcUser.slack_id ? String(hcUser.slack_id) : undefined,
      birthday: hcUser.birthdate,
      verificationStatus: hcUser.verification_status,
      address: hcUser.address
        ? {
            line1: hcUser.address.line1,
            line2: hcUser.address.line2,
            city: hcUser.address.city,
            state: hcUser.address.state,
            country: hcUser.address.country,
            zip: hcUser.address.zip,
          }
        : undefined,
      lastActiveTouchAt: new Date().toISOString(),
    };
    await session.save();

    const user = session.user;
    after(() =>
      recordLogin({
        email: user.email,
        name: user.name,
        slackId: user.slackId,
        address: user.address,
      }).catch((err) => console.error("[oauth/callback] recordLogin failed:", err))
    );

    const returnTo = cookieStore.get("oauth_return_to")?.value;
    cookieStore.delete("oauth_return_to");
    const destination = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/submit";
    return NextResponse.redirect(new URL(destination, req.url));
  } catch (err) {
    console.error("[oauth/callback] error:", err);
    return NextResponse.redirect(
      new URL("/submit?error=auth_failed", req.url)
    );
  }
}
