type Status = "Draft" | "Pending" | "Approved" | "Rejected";

const config: Record<Status, { label: string; classes: string }> = {
  Draft: {
    label: "unshipped",
    classes: "bg-ink/5 text-smoke border-smoke",
  },
  Pending: {
    label: "pending review",
    classes: "bg-ink/5 text-ink-soft border-smoke",
  },
  Approved: {
    label: "approved",
    classes: "bg-mint/20 text-mint border-mint",
  },
  Rejected: {
    label: "not approved",
    classes: "bg-magenta-soft/40 text-magenta-deep border-magenta",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, classes } = config[status] ?? config.Pending;
  return (
    <span
      className={`inline-flex items-center font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-pill border-[1.5px] ${classes}`}
    >
      {label}
    </span>
  );
}
