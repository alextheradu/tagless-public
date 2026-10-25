import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getSubmissionById,
  getSubmissionWindow,
  updateDraftSubmission,
  deleteDraftSubmission,
} from "@/lib/airtable";
import { isSubmissionsOpen } from "@/lib/submissionWindow";
import { getProjectsSnapshot } from "@/lib/hackatime";

const schema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  githubUsername: z.string().optional(),
  codeUrl: z.string().optional(),
  playableUrl: z.string().optional(),
  hackatimeProject: z.string().optional(),
  projectDescriptions: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  howDidYouHear: z.string().optional(),
  whatAreWeDoingWell: z.string().optional(),
  howCanWeImprove: z.string().optional(),
  lapseHours: z.string().optional(),
});

async function loadOwnedDraft(id: string, email: string) {
  const submission = await getSubmissionById(id);
  if (!submission || submission.Email !== email || submission.Status !== "Draft") {
    return null;
  }
  return submission;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSubmissionsOpen(await getSubmissionWindow())) {
    return NextResponse.json({ error: "Submissions are closed right now." }, { status: 403 });
  }

  const { id } = await params;
  const draft = await loadOwnedDraft(id, session.user.email);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

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
    record = await updateDraftSubmission(id, {
      ...(f.firstName !== undefined && { "First Name": f.firstName }),
      ...(f.lastName !== undefined && { "Last Name": f.lastName }),
      ...(f.githubUsername !== undefined && { "GitHub Username": f.githubUsername }),
      ...(f.codeUrl !== undefined && { "Code URL": f.codeUrl }),
      ...(f.playableUrl !== undefined && { "Playable URL": f.playableUrl }),
      ...(f.hackatimeProject !== undefined && { "Hackatime Project": f.hackatimeProject }),
      ...(f.description !== undefined && { Description: f.description }),
      ...(f.howDidYouHear !== undefined && { "How did you hear about this?": f.howDidYouHear }),
      ...(f.whatAreWeDoingWell !== undefined && { "What are we doing well?": f.whatAreWeDoingWell }),
      ...(f.howCanWeImprove !== undefined && { "How can we improve?": f.howCanWeImprove }),
      ...(f.lapseHours !== undefined && { "Lapse Hours": parseFloat(f.lapseHours) || 0 }),
      "ID Verification Status": session.user.verificationStatus ?? "",
      ...(session.user.slackId && { "Slack Handle": session.user.slackId }),
      ...(snapshot && {
        "Hackatime Project": snapshot.hackatimeProject,
        ...(snapshot.breakdown && { "Hackatime Project Breakdown": snapshot.breakdown }),
        "Normal Coding Hours": snapshot.normalHours,
        "AI Coding Hours": snapshot.aiHours,
      }),
    });
  } catch (err) {
    console.error("[api/submit/draft/:id] Airtable update failed:", err);
    return NextResponse.json({ error: "Failed to save draft. Please try again." }, { status: 500 });
  }

  return NextResponse.json(record);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draft = await loadOwnedDraft(id, session.user.email);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  await deleteDraftSubmission(id);
  return NextResponse.json({ ok: true });
}
