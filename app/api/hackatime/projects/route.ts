import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { HackatimeApiError, getProjects, getProjectsWithHours } from "@/lib/hackatime";

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam).toISOString() : undefined;

  const session = await getSession();
  if (!session.user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.hackatimeToken)
    return NextResponse.json({ error: "Hackatime not connected" }, { status: 403 });

  try {
    if (session.hackatimeUserId) {
      const projects = await getProjectsWithHours(
        session.hackatimeToken,
        session.hackatimeUserId,
        since ? { since } : undefined
      );
      return NextResponse.json({ projects });
    }

    const names = await getProjects(session.hackatimeToken);
    const projects = names.map((name) => ({ name, totalSeconds: 0 }));
    return NextResponse.json({ projects });
  } catch (err) {
    if (
      err instanceof HackatimeApiError &&
      (err.status === 401 || err.status === 403)
    ) {
      session.hackatimeToken = undefined;
      session.hackatimeUserId = undefined;
      await session.save();
      return NextResponse.json(
        { error: "Hackatime authorization failed. Please reconnect Hackatime." },
        { status: 403 }
      );
    }

    console.error("[hackatime/projects] failed to fetch projects:", err);
    return NextResponse.json(
      { error: "Could not fetch Hackatime projects" },
      { status: 502 }
    );
  }
}
