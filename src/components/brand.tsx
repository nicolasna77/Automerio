import { Link } from "@/i18n/navigation";
import { LOGO_MARK_PATH, LOGO_MARK_TRANSFORM, LOGO_TILE_RADIUS } from "@/lib/brand-mark";
import { cn } from "@/lib/utils";

export function AutomerioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      role="img"
      aria-label="Automerio"
    >
      <rect width="256" height="256" rx={LOGO_TILE_RADIUS} fill="var(--primary)" />
      <path
        d={LOGO_MARK_PATH}
        transform={LOGO_MARK_TRANSFORM}
        fill="var(--primary-foreground)"
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
