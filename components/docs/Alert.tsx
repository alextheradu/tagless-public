import {
  Info,
  Lightbulb,
  MessageSquareWarning,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { AlertType } from "@/lib/remarkAlerts";

const STYLES: Record<AlertType, { label: string; icon: LucideIcon; color: string }> = {
  note: { label: "Note", icon: Info, color: "text-cobalt" },
  tip: { label: "Tip", icon: Lightbulb, color: "text-mint" },
  important: { label: "Important", icon: MessageSquareWarning, color: "text-plum" },
  warning: { label: "Warning", icon: TriangleAlert, color: "text-magenta" },
  caution: { label: "Caution", icon: OctagonAlert, color: "text-magenta-deep" },
};

export function Alert({ type, children }: { type: AlertType; children: React.ReactNode }) {
  const { label, icon: Icon, color } = STYLES[type] ?? STYLES.note;
  return (
    <aside
      className={`border-[1.5px] border-ink rounded-md bg-paper-warm px-5 py-4 my-6 shadow-hard text-[15px] [&_p]:mb-0 [&_p:not(:last-child)]:mb-2 ${color}`}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] flex items-center gap-1.5 mb-1.5">
        <Icon size={14} aria-hidden />
        {label}
      </span>
      <div className="text-ink">{children}</div>
    </aside>
  );
}
