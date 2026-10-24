import { Link } from "@/i18n/navigation";
import { LOGO_MARK_PATH, LOGO_MARK_TRANSFORM, LOGO_TILE_RADIUS } from "@/lib/brand-mark";
import { cn } from "@/lib/utils";

// `decorative` : à côté du nom écrit, le symbole se tait (sinon le lien
// s'annonce « Automerio Automerio »).
export function AutomerioMark({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Automerio" })}
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
      <AutomerioMark className="size-7 shrink-0" decorative />
      <span className="text-lg tracking-tight">Automerio</span>
    </Link>
  );
}
