import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getReviewOpsBySubmissionId,
  getSubmissionById,
  getSubmissionWindow,
  getSubmissionsByEmail,
} from "@/lib/airtable";
import { hackerView } from "@/lib/submissionStatus";
import { isSubmissionsOpen } from "@/lib/submissionWindow";
import { rootProjectId, updateEligibility, updatesOf } from "@/lib/projectUpdates";
import { SubmissionDashboard } from "@/components/dashboard/SubmissionDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Submission: Tagless" };

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let user = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }
  if (!user) redirect("/submit");

  const raw = await getSubmissionById(id).catch(() => null);
  const submission = raw && hackerView(raw);
  if (!submission || submission.Email !== user.email) redirect("/submit");
  if (submission.Status === "Draft") redirect("/submit");

  const [reviewOps, all, submissionWindow] = await Promise.all([
    getReviewOpsBySubmissionId(submission._id).catch(() => null),
    getSubmissionsByEmail(user.email).catch(() => []),
    getSubmissionWindow().catch(() => ({ open: null, close: null })),
  ]);

  const rootId = rootProjectId(submission);
  const root = all.find((s) => s._id === rootId) ?? null;
  const eligibility = updateEligibility(rootId, all);

  return (
    <SubmissionDashboard
      user={user}
      submission={submission}
      reviewOps={reviewOps}
      root={root}
      updates={updatesOf(rootId, all)}
      updateSince={isSubmissionsOpen(submissionWindow) && eligibility.ok ? eligibility.since : null}
    />
  );
}
