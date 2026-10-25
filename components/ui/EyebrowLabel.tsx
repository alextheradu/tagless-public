import { cn } from "@/lib/utils";

export function EyebrowLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[12px] font-medium tracking-[0.14em] uppercase text-ink-soft", className)}>
      {children}
    </span>
  );
}
