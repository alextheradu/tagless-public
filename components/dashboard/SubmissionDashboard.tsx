import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";
import { ReviewTimeline } from "./ReviewTimeline";
import { ResubmitForm } from "./ResubmitForm";
import { UpdateForm } from "./UpdateForm";
import { projectNameFor } from "@/lib/submissionDisplay";
import { isProjectUpdate } from "@/lib/projectUpdates";
import type { AirtableRecordWithId, ReviewOpsWithId } from "@/lib/types";
import type { SessionData } from "@/lib/auth";

interface Props {
  user: NonNullable<SessionData["user"]>;
  submission: AirtableRecordWithId;
  reviewOps: ReviewOpsWithId | null;
  root: AirtableRecordWithId | null;
  updates: AirtableRecordWithId[];
  updateSince: string | null;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SubmissionDashboard({ user, submission, reviewOps, root, updates, updateSince }: Props) {
  const needsChanges = !!reviewOps?.["Needs Changes"] && submission.Status === "Pending";
  const submittedAt = submission._createdTime
    ? new Date(submission._createdTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <EyebrowLabel className="mb-4 block">
        {isProjectUpdate(submission) ? "project update" : "your dashboard"}
      </EyebrowLabel>
      {isProjectUpdate(submission) && root && (
        <p className="text-sm text-ink-soft mb-4">
          update to{" "}
          <Link href={`/submit/${root._id}`} className="text-cobalt underline">
            {projectNameFor(root)}
          </Link>
        </p>
      )}
      <div className="flex items-start justify-between gap-4 mb-12 flex-wrap">
        <h1
          className="font-display text-ink"
          style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.96 }}
        >
          {submission["First Name"]} {submission["Last Name"]}
        </h1>
        <StatusBadge status={submission.Status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-6">
            <EyebrowLabel>review progress</EyebrowLabel>
            <ReviewTimeline status={submission.Status} needsChanges={needsChanges} />
            {needsChanges ? (
              <p className="text-sm text-ink">
                A reviewer flagged something to fix before this can be approved.
                See their note below, then update your submission and it'll go
                back in the queue.
              </p>
            ) : submission.Status === "Pending" ? (
              <p className="text-sm text-ink-soft">
                Your project is in the review queue. We'll reach out via email
                and Slack once it's been reviewed - usually within a week.
              </p>
            ) : null}
            {submission.Status === "Approved" && (
              <p className="text-sm text-mint">
                Your project has been approved! Stickers and rewards are on their way.
              </p>
            )}
            {submission.Status === "Rejected" && (
              <p className="text-sm text-magenta">
                Your project wasn't approved this time. Check your email for
                details and feel free to resubmit.
              </p>
            )}
            {submission.Notes && (needsChanges || submission.Status === "Approved" || submission.Status === "Rejected") && (
              <div className="border-[1.5px] border-bone rounded-md p-4 bg-paper-warm">
                <EyebrowLabel className="mb-2 block text-[10px]">
                  reviewer note
                </EyebrowLabel>
                <p className="text-sm text-ink">{submission.Notes}</p>
              </div>
            )}
          </Card>

          {needsChanges && <ResubmitForm submission={submission} />}

          {root && updateSince && <UpdateForm user={user} root={root} since={updateSince} />}

          {root && updates.length > 0 && (
            <Card className="p-6 flex flex-col gap-3">
              <EyebrowLabel>project history</EyebrowLabel>
              <ul className="flex flex-col divide-y divide-bone">
                {[root, ...updates].map((s) => (
                  <li key={s._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    {s._id === submission._id ? (
                      <span className="text-ink font-bold">
                        {isProjectUpdate(s) ? "update" : "original"} · {shortDate(s._createdTime)} (this page)
                      </span>
                    ) : (
                      <Link href={`/submit/${s._id}`} className="text-cobalt underline">
                        {isProjectUpdate(s) ? "update" : "original"} · {shortDate(s._createdTime)}
                      </Link>
                    )}
                    <StatusBadge status={s.Status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6 flex flex-col gap-4">
            <EyebrowLabel>submission details</EyebrowLabel>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Field label="name" value={`${submission["First Name"]} ${submission["Last Name"]}`} />
              <Field label="email" value={submission.Email} />
              <Field label="slack" value={submission["Slack Handle"]} />
              <Field label="github" value={submission["GitHub Username"]} />
              <Field label="code url" value={submission["Code URL"]} href={submission["Code URL"]} />
              <Field label="playable url" value={submission["Playable URL"]} href={submission["Playable URL"]} />
              <Field label="submitted" value={submittedAt ?? "-"} />
            </div>
            {submission.Description && (
              <div className="pt-3 border-t border-bone">
                <p className="text-xs text-smoke uppercase tracking-wider font-mono mb-1">
                  description
                </p>
                <p className="text-sm text-ink">{submission.Description}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-3">
            <EyebrowLabel>quick links</EyebrowLabel>
            <ButtonLink
              href={submission["Playable URL"]}
              variant="ink"
              className="text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              view live site →
            </ButtonLink>
            <ButtonLink
              href={submission["Code URL"]}
              variant="ghost"
              className="text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              github repo
            </ButtonLink>
            <ButtonLink href="/docs/rules" variant="ghost" className="text-sm">
              review the rules
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-wider text-smoke mb-0.5">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-cobalt underline text-sm break-all">
          {value}
        </a>
      ) : (
        <p className="text-ink text-sm">{value}</p>
      )}
    </div>
  );
}
