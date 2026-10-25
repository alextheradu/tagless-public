export function getSessionOptions() {
  return {
    password: process.env.SESSION_SECRET || "fallback_insecure_set_SESSION_SECRET_now!!",
    cookieName: "tagless_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}
