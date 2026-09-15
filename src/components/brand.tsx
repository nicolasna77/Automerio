import Link from "next/link";
import { cn } from "@/lib/utils";

export function AutomerioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Automerio"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M9.6 21.8L16 10.2L22.4 21.8M11.48 18.4H20.52"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="10.2" r="2.15" fill="var(--primary-foreground)" />
      <circle cx="9.6" cy="21.8" r="1.75" fill="var(--primary-foreground)" />
      <circle cx="22.4" cy="21.8" r="1.75" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function AutomerioLogo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <AutomerioMark className="size-7 shrink-0" />
      <span className="text-lg tracking-tight">Automerio</span>
    </Link>
  );
}
