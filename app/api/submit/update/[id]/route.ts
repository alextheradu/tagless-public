import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getMultiProjectStats, getProjectDateRange } from "@/lib/hackatime";
import {
  createQueueSubmission,
  getSubmissionWindow,
  getSubmissionsByEmail,
  uploadScreenshot,
} from "@/lib/airtable";
import { isSubmissionsOpen } from "@/lib/submissionWindow";
import { sumHours, formatHackatimeDateRange } from "@/lib/submissionHours";
import {
  MAX_HACKATIME_PROJECTS,
  formatProjectBreakdown,
  joinHackatimeProjects,
  parseHackatimeProjects,
  parseProjectDescriptions,
} from "@/lib/hackatimeProjects";
import { isIdVerified } from "@/lib/identity";
import { MIN_HOURS_FOR_UPDATE, updateEligibility } from "@/lib/projectUpdates";

const schema = z.object({
  codeUrl: z.string().url(),
  playableUrl: z.string().url(),
  hackatimeProject: z.string().min(1),
  projectDescriptions: z.string().optional().default(""),
  description: z.string().min(10),
  lapseHours: z.string().optional().default("0"),
  lapseJustification: z.string().optional().default(""),
  noAiPledge: z.literal("true"),
  rulesPledge: z.literal("true"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.user.slackId) {
    return NextResponse.json(
      { error: "Hack Club OAuth did not return a Slack ID. Please sign in again." },
      { status: 422 }
    );
  }
  if (!isSubmissionsOpen(await getSubmissionWindow())) {
    return NextResponse.json({ error: "Submissions are closed right now." }, { status: 403 });
  }
  if (!isIdVerified(session.user.verificationStatus)) {
    return NextResponse.json(
      {
        error: "Your Hack Club account isn't ID verified yet. Verify at identity.hackclub.com, then sign out and back in here before shipping.",
      },
      { status: 403 }
    );
  }
  if (!session.hackatimeToken || !session.hackatimeUserId) {
    return NextResponse.json(
      { error: "Hackatime not connected. Please connect your Hackatime account." },
      { status: 403 }
    );
  }
  if (!session.user.address?.line1) {
    return NextResponse.json(
      { error: "Your Hack Club account has no address on file. Add one at identity.hackclub.com, then sign out and back in." },
      { status: 422 }
    );
  }

  const { id } = await params;
  const submissions = await getSubmissionsByEmail(session.user.email).catch(() => null);
  if (!submissions) {
    return NextResponse.json({ error: "Couldn't load your projects. Please try again." }, { status: 503 });
  }
  const eligibility = updateEligibility(id, submissions);
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.reason }, { status: 409 });
  }
  const { root, since } = eligibility;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const raw = Object.fromEntries(
    Array.from(form.keys())
      .filter((k) => k !== "screenshot")
      .map((k) => [k, form.get(k)])
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error("[api/submit/update] validation failed:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid form data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const fields = parsed.data;

  const screenshot = form.get("screenshot");
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    return NextResponse.json({ error: "Screenshot is required" }, { status: 400 });
  }

  const projects = parseHackatimeProjects(fields.hackatimeProject);
  if (projects.length === 0) {
    return NextResponse.json({ error: "Pick at least one Hackatime project." }, { status: 422 });
  }
  if (projects.length > MAX_HACKATIME_PROJECTS) {
    return NextResponse.json(
      { error: `Pick at most ${MAX_HACKATIME_PROJECTS} Hackatime projects.` },
      { status: 422 }
    );
  }
  const projectDescriptions = parseProjectDescriptions(fields.projectDescriptions);
  if (projects.length > 1) {
    const missing = projects.filter((p) => !projectDescriptions[p]?.trim());
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Describe what each Hackatime project is (missing: ${missing.join(", ")}).` },
        { status: 422 }
      );
    }
  }

  const lapseHours = Math.max(0, parseFloat(fields.lapseHours) || 0);
  if (!Number.isFinite(lapseHours) || lapseHours > 1000) {
    return NextResponse.json({ error: "Lapse hours must be a realistic number." }, { status: 422 });
  }
  if (lapseHours > 0 && !fields.lapseJustification.trim()) {
    return NextResponse.json(
      { error: "Add links explaining your claimed lapse hours before shipping." },
      { status: 422 }
    );
  }

  const statsThrough = new Date().toISOString();
  let stats;
  let perProjectStats;
  try {
    const result = await getMultiProjectStats(session.hackatimeToken, session.hackatimeUserId, projects, {
      since,
      until: statsThrough,
    });
    stats = result.total;
    perProjectStats = result.perProject;
  } catch {
    return NextResponse.json(
      { error: "Could not fetch Hackatime stats. Check your API key and project name." },
      { status: 422 }
    );
  }

  const qualifyingHours = sumHours(stats.combinedSeconds / 3600, lapseHours);
  if (qualifyingHours < MIN_HOURS_FOR_UPDATE) {
    return NextResponse.json(
      {
        error: `Only ${qualifyingHours.toFixed(1)} new hours logged since your last ship. Updates need at least ${MIN_HOURS_FOR_UPDATE}.`,
      },
      { status: 422 }
    );
  }

  const hackatimeToken = session.hackatimeToken;
  const hackatimeUserId = session.hackatimeUserId;
  const dateRanges = await Promise.all(
    projects.map(async (project) => {
      const range = await getProjectDateRange(hackatimeToken, hackatimeUserId, project);
      return range ? formatHackatimeDateRange(project, since, range.lastHeartbeat) : "";
    })
  );

  let record;
  try {
    record = await createQueueSubmission({
      "Update Of": root._id,
      "Code URL": fields.codeUrl,
      "Playable URL": fields.playableUrl,
      "How did you hear about this?": root["How did you hear about this?"],
      "What are we doing well?": root["What are we doing well?"],
      "How can we improve?": root["How can we improve?"],
      "First Name": root["First Name"],
      "Last Name": root["Last Name"],
      Email: session.user.email,
      Description: fields.description,
      "GitHub Username": root["GitHub Username"],
      "Address (Line 1)": session.user.address.line1,
      "Address (Line 2)": session.user.address.line2 ?? "",
      City: session.user.address.city,
      "State / Province": session.user.address.state,
      Country: session.user.address.country,
      "ZIP / Postal Code": session.user.address.zip,
      Birthday: session.user.birthday || root.Birthday,
      "Slack Handle": session.user.slackId,
      "ID Verification Status": session.user.verificationStatus ?? "",
      "Hackatime Project": joinHackatimeProjects(projects),
      ...(projects.length > 1 && {
        "Hackatime Project Breakdown": formatProjectBreakdown(
          projects.map((name, i) => ({
            name,
            hours: perProjectStats[i].combinedSeconds / 3600,
            aiHours: perProjectStats[i].aiSeconds / 3600,
            description: projectDescriptions[name],
          }))
        ),
      }),
      "Normal Coding Hours": parseFloat((stats.totalSeconds / 3600).toFixed(2)),
      "AI Coding Hours": parseFloat((stats.aiSeconds / 3600).toFixed(2)),
      "Lapse Hours": parseFloat(lapseHours.toFixed(2)),
      "Justification - Lapse Links, comma-separated": fields.lapseJustification,
      "Justification - Submitter Hackatime ID": session.hackatimeUserId,
      "Justification - Hackatime Project Name(s) + Date Range(s)": dateRanges.filter(Boolean).join(", "),
      "Hackatime Stats Through": statsThrough,
    });
  } catch (err) {
    console.error("[api/submit/update] Airtable create failed:", err);
    return NextResponse.json({ error: "Failed to save your update. Please try again." }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    await uploadScreenshot(record._id, buffer.toString("base64"), screenshot.name, screenshot.type || "image/png");
  } catch (err) {
    console.error("Screenshot upload failed for record", record._id, err);
  }

  return NextResponse.json({ ok: true, id: record._id });
}
