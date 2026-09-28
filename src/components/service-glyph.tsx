import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_BRANDS, SERVICE_ICONS } from "@/lib/service-icons";

export function isBrandService(slug: string): boolean {
  return slug in SERVICE_BRANDS;
}

export function ServiceGlyph({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const brand = SERVICE_BRANDS[slug];
  if (brand) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.src}
        alt=""
        aria-hidden="true"
        className={cn("object-contain", className)}
      />
    );
  }

  const Icon = SERVICE_ICONS[slug] ?? Bot;
  return <Icon className={className} aria-hidden="true" />;
}

const BADGE_SIZES = {
  md: { box: "size-9 rounded-md", icon: "size-4", brand: "size-7" },
  lg: { box: "size-11 rounded-lg", icon: "size-5", brand: "size-9" },
} as const;

export function ServiceGlyphBadge({
  slug,
  size = "md",
  className,
}: {
  slug: string;
  size?: keyof typeof BADGE_SIZES;
  className?: string;
}) {
  const brand = isBrandService(slug);
  const { box, icon, brand: brandSize } = BADGE_SIZES[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        box,
        !brand && "bg-primary/10 text-primary",
        className
      )}
    >
      <ServiceGlyph slug={slug} className={brand ? brandSize : icon} />
    </span>
  );
}
