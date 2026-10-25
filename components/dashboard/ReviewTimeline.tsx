type Status = "Draft" | "Pending" | "Approved" | "Rejected";

const steps = [
  { key: "submitted", label: "submitted" },
  { key: "review", label: "in review" },
  { key: "approved", label: "approved" },
] as const;

function getActiveStep(status: Status): number {
  if (status === "Rejected") return 1;
  if (status === "Pending") return 1;
  if (status === "Approved") return 2;
  return 0;
}

export function ReviewTimeline({ status, needsChanges }: { status: Status; needsChanges?: boolean }) {
  const active = getActiveStep(status);
  const rejected = status === "Rejected";
  const flagged = needsChanges && status === "Pending";

  return (
    <div className="flex items-start gap-0 w-full">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const isFailed = rejected && i === active;
        const isFlagged = flagged && i === active;

        return (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={`flex-1 h-[2px] ${done ? "bg-mint" : "bg-bone"}`} />
              )}
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isFailed
                    ? "border-magenta bg-magenta-soft/40"
                    : done
                    ? "border-mint bg-mint"
                    : current
                    ? "border-ink bg-highlight"
                    : "border-bone bg-paper"
                }`}
              >
                {done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isFailed && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="#ff2d6f" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
                {isFlagged && (
                  <span className="font-mono text-xs font-bold text-ink">!</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-[2px] ${done ? "bg-mint" : "bg-bone"}`} />
              )}
            </div>
            <span
              className={`mt-2 font-mono text-[11px] uppercase tracking-wide text-center ${
                isFailed
                  ? "text-magenta"
                  : done
                  ? "text-mint"
                  : current
                  ? "text-ink font-bold"
                  : "text-smoke"
              }`}
            >
              {isFailed ? "rejected" : isFlagged ? "needs changes" : step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
