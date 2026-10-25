import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "./StatusBadge";
import { isProjectUpdate } from "@/lib/projectUpdates";
import type { AirtableRecordWithId } from "@/lib/types";

interface Props {
  submission: AirtableRecordWithId;
  stamps: number;
  canClaimTag: boolean;
}

export function SubmissionCard({ submission, stamps, canClaimTag }: Props) {
  const screenshotUrl = submission.Screenshot?.[0]?.url;

  return (
    <Card className="overflow-hidden flex flex-col p-0">
      <Link href={`/submit/${submission._id}`} className="no-underline">
        <div className="aspect-video bg-paper-warm border-b-[1.5px] border-ink overflow-hidden">
          {screenshotUrl ? (
            <img src={screenshotUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-smoke text-sm font-mono">
              no screenshot
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <StatusBadge status={submission.Status} />
              {isProjectUpdate(submission) && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">update</span>
              )}
            </span>
            {stamps > 0 && (
              <span className="font-mono text-xs text-ink-soft">+{stamps} stamps</span>
            )}
          </div>
          <p className="text-sm text-ink line-clamp-2">{submission.Description}</p>
        </div>
      </Link>
      {submission.Status === "Approved" && (submission["Tag Claimed"] || canClaimTag) && (
        <div className="px-4 pb-4">
          {submission["Tag Claimed"] ? (
            <span className="text-xs font-mono text-mint">tag claimed ✓</span>
          ) : (
            <Link
              href={`/claim/${submission._id}`}
              className="text-xs font-mono underline text-cobalt"
            >
              claim your luggage tag
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
