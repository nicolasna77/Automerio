import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_BRANDS, SERVICE_ICONS } from "@/lib/service-icons";

export function isBrandService(slug: string): boolean {
  return slug in SERVICE_BRANDS;
}

/**
 * L'icone d'une solution : le logo officiel de la plateforme quand il y en a
 * une, sinon notre glyphe maison. Le logo est servi tel que Meta le fournit —
 * aucune classe de couleur ne l'atteint, un `<img>` ignorant `currentColor`.
 */
export function ServiceGlyph({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const brand = SERVICE_BRANDS[slug];
  if (brand) {
    // `next/image` refuse les SVG sans `dangerouslyAllowSVG`, et n'apporterait
    // rien sur un fichier local de 1 ko affiche a 20 px.
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

/**
 * La pastille qui entoure l'icone. Un logo de marque n'y reçoit pas le fond
 * teinte des glyphes maison : Meta demande ses couleurs d'origine sur un fond
 * neutre, et sa zone de respiration — d'ou un logo plus petit que la pastille.
 */
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
