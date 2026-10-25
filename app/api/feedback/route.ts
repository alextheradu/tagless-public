import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createFeedback, hasSubmittedFeedback } from "@/lib/airtable";
import { PARTICIPATION_OPTIONS } from "@/lib/feedback";

const schema = z.object({
  recommend: z.coerce.number().int().min(1).max(10),
  didWell: z.string().trim().min(1).max(5000),
  improve: z.string().trim().min(1).max(5000),
  extraThoughts: z.string().trim().max(5000).optional().default(""),
  canEmail: z.enum(["yes", "no"]),
  participation: z.enum(PARTICIPATION_OPTIONS),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid form data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = session.user;
  if (await hasSubmittedFeedback(user.id)) {
    return NextResponse.json(
      { error: "You've already filled out this form. Thanks!" },
      { status: 409 }
    );
  }

  const data = parsed.data;
  await createFeedback({
    hcUserId: user.id,
    email: user.email,
    name: user.name,
    slackId: user.slackId,
    recommend: data.recommend,
    didWell: data.didWell,
    improve: data.improve,
    extraThoughts: data.extraThoughts,
    canEmail: data.canEmail === "yes",
    participation: data.participation,
  });

  return NextResponse.json({ ok: true });
}
