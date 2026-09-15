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
      <defs>
        {/* ids fixes : le mark est rendu plusieurs fois par page (en-tête,
            pied, sidebar) et toutes les instances sont identiques, donc le
            premier <defs> rencontré peint correctement les suivantes. */}
        <linearGradient
          id="automerio-mark-tile"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#6d3bff" />
          <stop offset="1" stopColor="#2a1a9e" />
        </linearGradient>
        <pattern
          id="automerio-mark-dots"
          width="4.5"
          height="4.5"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2.25" cy="2.25" r="0.7" fill="#eef2ff" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#automerio-mark-tile)" />
      <rect width="32" height="32" rx="9" fill="url(#automerio-mark-dots)" />
      <path
        d="M9.6 21.8L16 10.2L22.4 21.8M11.48 18.4H20.52"
        fill="none"
        stroke="#eef2ff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 13.6L18.4 18.4H13.6Z" fill="#25e6f0" />
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
