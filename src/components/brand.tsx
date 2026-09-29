import { useId } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AutomerioMark({ className }: { className?: string }) {
  const uid = useId();
  const clipId = `${uid}-clip`;
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Automerio"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g clipPath={`url(#${clipId})`}>
        <g transform="rotate(-38 16 16)">
          <rect x="-8" y="6" width="48" height="6" fill="var(--primary-foreground)" opacity="0.22" />
          <rect x="-8" y="14.5" width="48" height="2.4" fill="var(--primary-foreground)" opacity="0.13" />
        </g>
      </g>
      <path
        d="M9.6 21.8L16 10.2L22.4 21.8M11.48 18.4H20.52"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 13.6L18.4 18.4H13.6Z"
        fill="var(--primary-foreground)"
        opacity="0.45"
      />
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
