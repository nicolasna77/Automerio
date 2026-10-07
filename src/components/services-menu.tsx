"use client";

import { Link } from "@/i18n/navigation";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { NavMenu, NavMenuTrigger } from "@/components/nav-menu";
import { ServiceGlyph } from "@/components/service-glyph";
import { useTranslations } from "next-intl";
import type { ServiceCategory, ServiceMenuItem } from "@/lib/catalog";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

// Menu « Solutions » de l'en-tête : chaque catégorie sur deux colonnes, chaque
// solution avec son icône, son nom et une ligne qui dit ce qu'elle fait. Les
// solutions remplissent la colonne de gauche puis celle de droite : l'ordre
// du DOM suit l'œil, et les flèches haut/bas du menu descendent une colonne.
export function ServicesMenu({ services }: { services: ServiceMenuItem[] }) {
  const t = useTranslations();
  const groups = MENU_CATEGORIES.map((category) => {
    const items = services.filter((s) => s.category === category);
    const half = Math.ceil(items.length / 2);
    return { category, columns: [items.slice(0, half), items.slice(half)] };
  }).filter(({ columns }) => columns[0].length > 0);

  return (
    <NavMenu>
      <NavMenuTrigger>{t("Site.nav.services")}</NavMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className="w-[42rem] max-w-[calc(100vw-2rem)] space-y-2 p-3"
      >
        {groups.map(({ category, columns }) => (
          <DropdownMenuGroup key={category}>
            <DropdownMenuLabel className="px-2.5 pt-1 pb-2">
              {t(`Catalog.categories.${category}`)}
            </DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-x-2">
              {columns.map((column, index) => (
                <div key={index} className="min-w-0">
                  {column.map((service) => (
                    <DropdownMenuItem
                      key={service.slug}
                      render={<Link href={`/services/${service.slug}`} />}
                      className="items-start gap-3 px-2.5 py-2.5"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                        <ServiceGlyph slug={service.slug} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block leading-snug text-foreground">{service.name}</span>
                        {/* « ! » : l'élément de menu repeint tout son contenu
                            au survol ; l'accroche reste en retrait. */}
                        {service.tagline && (
                          <span className="mt-0.5 block text-sm leading-snug font-normal text-muted-foreground!">
                            {service.tagline}
                          </span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </div>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </NavMenu>
  );
}
