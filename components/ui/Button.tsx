import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "ink" | "ghost" | "mono";

type ButtonProps = {
  variant?: Variant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type AnchorProps = {
  variant?: Variant;
  href: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

const base =
  "inline-flex items-center gap-2 px-[18px] py-[11px] rounded-pill font-body font-bold text-[15px] border border-ink leading-none transition-[transform,box-shadow,opacity] duration-[120ms] cursor-pointer no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0";

const variants: Record<Variant, string> = {
  primary: "bg-magenta !text-white shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1a1729] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  ink: "bg-ink !text-paper shadow-magenta hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  ghost: "bg-transparent !text-ink hover:bg-paper-warm",
  mono: "bg-paper !text-ink font-mono font-medium tracking-wide",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...props} />
  );
}

export function ButtonLink({ variant = "primary", className, href, ...props }: AnchorProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...props} />
  );
}
