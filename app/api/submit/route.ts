import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getMultiProjectStats, getProjectDateRange } from "@/lib/hackatime";
import {
  createQueueSubmission,
  finalizeDraftSubmission,
  getSubmissionById,
  getSubmissionWindow,
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
import { MIN_HOURS_FOR_TAG } from "@/lib/rewards";

export const maxDuration = 60;

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  githubUsername: z.string().min(1),
  codeUrl: z.string().url(),
  playableUrl: z.string().url(),
  hackatimeProject: z.string().min(1),
  projectDescriptions: z.string().optional().default(""),
  description: z.string().min(10),
  howDidYouHear: z.string().min(1),
  whatAreWeDoingWell: z.string().optional().default(""),
  howCanWeImprove: z.string().optional().default(""),
  lapseHours: z.string().optional().default("0"),
  lapseJustification: z.string().optional().default(""),
  noAiPledge: z.literal("true"),
  tutorialPledge: z.literal("true"),
  rulesPledge: z.literal("true"),
  birthday: z.string().optional().default(""),
  draftId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const mark = (step: string) => console.log(`[api/submit] ${step} +${Date.now() - t0}ms`);
  mark("start");
  const session = await getSession();
  mark("session");
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.user.slackId) {
    return NextResponse.json(
      { error: "Hack Club OAuth did not return a Slack ID. Please sign in again." },
      { status: 422 }
    );
  }
  const window = await getSubmissionWindow();
  mark("window");
  if (!isSubmissionsOpen(window)) {
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
  const form = await req.formData().catch(() => null);
  mark("formData");
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
    console.error("[api/submit] validation failed:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid form data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const screenshot = form.get("screenshot");
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    console.error("[api/submit] missing/empty screenshot:", typeof screenshot, screenshot instanceof File ? screenshot.size : "n/a");
    return NextResponse.json({ error: "Screenshot is required" }, { status: 400 });
  }

  const { hackatimeProject: rawProjects, projectDescriptions: rawDescriptions, draftId, ...fields } = parsed.data;

  const projects = parseHackatimeProjects(rawProjects);
  if (projects.length === 0) {
    return NextResponse.json({ error: "Pick at least one Hackatime project." }, { status: 422 });
  }
  if (projects.length > MAX_HACKATIME_PROJECTS) {
    return NextResponse.json(
      { error: `Pick at most ${MAX_HACKATIME_PROJECTS} Hackatime projects.` },
      { status: 422 }
    );
  }
  const hackatimeProject = joinHackatimeProjects(projects);
  const projectDescriptions = parseProjectDescriptions(rawDescriptions);
  if (projects.length > 1) {
    const missing = projects.filter((p) => !projectDescriptions[p]?.trim());
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Describe what each Hackatime project is (missing: ${missing.join(", ")}).` },
        { status: 422 }
      );
    }
  }

  if (draftId) {
    const draft = await getSubmissionById(draftId);
    if (!draft || draft.Email !== session.user.email || draft.Status !== "Draft") {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
  }

  const birthday = session.user.birthday || fields.birthday;
  if (!birthday) {
    return NextResponse.json({ error: "Birthday is required." }, { status: 422 });
  }

  const lapseHours = Math.max(0, parseFloat(fields.lapseHours) || 0);
  if (!Number.isFinite(lapseHours) || lapseHours > 1000) {
    return NextResponse.json(
      { error: "Lapse hours must be a realistic number." },
      { status: 422 }
    );
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

  const hackatimeToken = session.hackatimeToken;
  const hackatimeUserId = session.hackatimeUserId;
  const dateRanges = await Promise.all(
    projects.map(async (project) => {
      const range = await getProjectDateRange(hackatimeToken, hackatimeUserId, project);
      return range ? formatHackatimeDateRange(project, range.firstHeartbeat, range.lastHeartbeat) : "";
    })
  );

  mark("hackatime");
  const normalHours = stats.totalSeconds / 3600;
  const combinedHours = stats.combinedSeconds / 3600;
  const qualifyingHours = sumHours(combinedHours, lapseHours);
  if (qualifyingHours < MIN_HOURS_FOR_TAG) {
    return NextResponse.json(
      {
        error: `Only ${qualifyingHours.toFixed(1)} hours logged. Minimum ${MIN_HOURS_FOR_TAG} hours required.`,
      },
      { status: 422 }
    );
  }

  const submissionFields = {
    "Code URL": fields.codeUrl,
    "Playable URL": fields.playableUrl,
    "How did you hear about this?": fields.howDidYouHear,
    "What are we doing well?": fields.whatAreWeDoingWell,
    "How can we improve?": fields.howCanWeImprove,
    "First Name": fields.firstName,
    "Last Name": fields.lastName,
    Email: fields.email,
    Description: fields.description,
    "GitHub Username": fields.githubUsername,
    "Address (Line 1)": session.user.address.line1,
    "Address (Line 2)": session.user.address.line2 ?? "",
    City: session.user.address.city,
    "State / Province": session.user.address.state,
    Country: session.user.address.country,
    "ZIP / Postal Code": session.user.address.zip,
    Birthday: birthday,
    "Slack Handle": session.user.slackId,
    "ID Verification Status": session.user.verificationStatus ?? "",
    "Hackatime Project": hackatimeProject,
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
    "Normal Coding Hours": parseFloat(normalHours.toFixed(2)),
    "AI Coding Hours": parseFloat((stats.aiSeconds / 3600).toFixed(2)),
    "Lapse Hours": parseFloat(lapseHours.toFixed(2)),
    "Justification - Lapse Links, comma-separated": fields.lapseJustification,
    "Justification - Submitter Hackatime ID": session.hackatimeUserId,
    "Justification - Hackatime Project Name(s) + Date Range(s)": dateRanges.filter(Boolean).join(", "),
    "Hackatime Stats Through": statsThrough,
  };

  let record;
  try {
    record = draftId
      ? await finalizeDraftSubmission(draftId, submissionFields)
      : await createQueueSubmission(submissionFields);
  } catch (err) {
    console.error("[api/submit] Airtable create failed:", err);
    return NextResponse.json({ error: "Failed to save submission. Please try again." }, { status: 500 });
  }

  mark("airtable record");

  try {
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    await uploadScreenshot(
      record._id,
      buffer.toString("base64"),
      screenshot.name,
      screenshot.type || "image/png"
    );
  } catch (err) {
    console.error("Screenshot upload failed for record", record._id, err);
  }

  mark("done");
  return NextResponse.json({ ok: true });
}
