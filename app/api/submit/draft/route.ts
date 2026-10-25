import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createDraftSubmission, getSubmissionWindow } from "@/lib/airtable";
import { isSubmissionsOpen } from "@/lib/submissionWindow";
import { getProjectsSnapshot } from "@/lib/hackatime";

const schema = z.object({
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  githubUsername: z.string().optional().default(""),
  codeUrl: z.string().optional().default(""),
  playableUrl: z.string().optional().default(""),
  hackatimeProject: z.string().optional().default(""),
  projectDescriptions: z.record(z.string(), z.string()).optional().default({}),
  description: z.string().optional().default(""),
  howDidYouHear: z.string().optional().default(""),
  whatAreWeDoingWell: z.string().optional().default(""),
  howCanWeImprove: z.string().optional().default(""),
  lapseHours: z.string().optional().default("0"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSubmissionsOpen(await getSubmissionWindow())) {
    return NextResponse.json({ error: "Submissions are closed right now." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const f = parsed.data;

  const snapshot =
    f.hackatimeProject && session.hackatimeToken && session.hackatimeUserId
      ? await getProjectsSnapshot(
          session.hackatimeToken,
          session.hackatimeUserId,
          f.hackatimeProject,
          f.projectDescriptions ?? {}
        )
      : null;

  let record;
  try {
    record = await createDraftSubmission({
      "First Name": f.firstName,
      "Last Name": f.lastName,
      Email: session.user.email,
      "Slack Handle": session.user.slackId ?? "",
      "GitHub Username": f.githubUsername,
      "Code URL": f.codeUrl,
      "Playable URL": f.playableUrl,
      "Hackatime Project": f.hackatimeProject,
      Description: f.description,
      "How did you hear about this?": f.howDidYouHear,
      "What are we doing well?": f.whatAreWeDoingWell,
      "How can we improve?": f.howCanWeImprove,
      "Lapse Hours": parseFloat(f.lapseHours) || 0,
      "ID Verification Status": session.user.verificationStatus ?? "",
      ...(snapshot && {
        "Hackatime Project": snapshot.hackatimeProject,
        ...(snapshot.breakdown && { "Hackatime Project Breakdown": snapshot.breakdown }),
        "Normal Coding Hours": snapshot.normalHours,
        "AI Coding Hours": snapshot.aiHours,
      }),
    });
  } catch (err) {
    console.error("[api/submit/draft] Airtable create failed:", err);
    return NextResponse.json({ error: "Failed to save draft. Please try again." }, { status: 500 });
  }

  return NextResponse.json(record);
}
