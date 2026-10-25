import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warm" | "ink";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  const bg = {
    default: "bg-paper border-ink",
    warm: "bg-paper-warm border-ink",
    ink: "bg-ink text-paper border-ink",
  }[variant];

  return (
    <div
      className={cn("border-[1.5px] rounded-md shadow-hard p-6", bg, className)}
      {...props}
    >
      {children}
    </div>
  );
}
