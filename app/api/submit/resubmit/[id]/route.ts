import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getReviewOpsBySubmissionId,
  getSubmissionById,
  updateSubmission,
  upsertReviewOps,
} from "@/lib/airtable";
import { getProjectsSnapshot } from "@/lib/hackatime";
import { descriptionsFromBreakdown } from "@/lib/hackatimeProjects";

const schema = z.object({
  codeUrl: z.string().url(),
  playableUrl: z.string().url(),
  githubUsername: z.string().min(1),
  description: z.string().min(10),
  hackatimeProject: z.string().optional(),
  lapseHours: z.string().optional(),
  lapseJustification: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const submission = await getSubmissionById(id).catch(() => null);
  if (!submission || submission.Email !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.Status !== "Pending") {
    return NextResponse.json({ error: "This submission isn't in review right now." }, { status: 409 });
  }

  const reviewOps = await getReviewOpsBySubmissionId(id).catch(() => null);
  if (!reviewOps?.["Needs Changes"]) {
    return NextResponse.json(
      { error: "No changes have been requested on this submission." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const f = parsed.data;

  if (f.lapseHours !== undefined) {
    const claimed = Math.max(0, parseFloat(f.lapseHours) || 0);
    if (!Number.isFinite(claimed) || claimed > 1000) {
      return NextResponse.json(
        { error: "Lapse hours must be a realistic number." },
        { status: 422 }
      );
    }
    if (claimed > 0 && !f.lapseJustification?.trim()) {
      return NextResponse.json(
        { error: "Add links explaining your claimed lapse hours." },
        { status: 422 }
      );
    }
  }

  const snapshot =
    f.hackatimeProject && session.hackatimeToken && session.hackatimeUserId
      ? await getProjectsSnapshot(
          session.hackatimeToken,
          session.hackatimeUserId,
          f.hackatimeProject,
          descriptionsFromBreakdown(submission["Hackatime Project Breakdown"])
        )
      : null;

  try {
    await updateSubmission(id, {
      "Code URL": f.codeUrl,
      "Playable URL": f.playableUrl,
      "GitHub Username": f.githubUsername,
      Description: f.description,
      ...(f.hackatimeProject && { "Hackatime Project": f.hackatimeProject }),
      ...(f.lapseHours !== undefined && { "Lapse Hours": parseFloat(f.lapseHours) || 0 }),
      ...(f.lapseJustification !== undefined && {
        "Justification - Lapse Links, comma-separated": f.lapseJustification,
      }),
      ...(snapshot && {
        "Hackatime Project": snapshot.hackatimeProject,
        ...(snapshot.breakdown && { "Hackatime Project Breakdown": snapshot.breakdown }),
        "Normal Coding Hours": snapshot.normalHours,
        "AI Coding Hours": snapshot.aiHours,
      }),
    });
    await upsertReviewOps(id, {
      "Needs Changes": false,
      "Checklist - Title Not Placeholder": false,
      "Checklist - Has README": false,
      "Checklist - Demo Not Sleeping": false,
      "Checklist - Demo Visitable": false,
    });
  } catch (err) {
    console.error("[api/submit/resubmit] Failed to save resubmission:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
