import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AutomerioMark({ className }: { className?: string }) {
  const uid = useId();
  const tileId = `${uid}-tile`;
  const clipId = `${uid}-clip`;
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Automerio"
    >
      <defs>
        <linearGradient
          id={tileId}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5b2bd9" />
          <stop offset="1" stopColor="#2a1a9e" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${tileId})`} />
      <g clipPath={`url(#${clipId})`}>
        <g transform="rotate(-38 16 16)">
          <rect x="-8" y="6" width="48" height="6" fill="#eef2ff" opacity="0.22" />
          <rect x="-8" y="14.5" width="48" height="2.4" fill="#eef2ff" opacity="0.13" />
        </g>
      </g>
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
