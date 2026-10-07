"use client";

import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceGlyph } from "@/components/service-glyph";
import { useTranslations } from "next-intl";
import type { ServiceCategory, ServiceMenuItem } from "@/lib/catalog";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

// Menu « Solutions » de l'en-tête : chaque catégorie sur deux colonnes, chaque
// solution avec son icône, son nom et une ligne qui dit ce qu'elle fait. Deux
// colonnes par catégorie plutôt qu'une par catégorie : le panneau reste plein
// quel que soit le nombre de solutions de chacune.
export function ServicesMenu({ services }: { services: ServiceMenuItem[] }) {
  const t = useTranslations();
  const columns = MENU_CATEGORIES.map((category) => ({
    category,
    categoryServices: services.filter((s) => s.category === category),
  })).filter(({ categoryServices }) => categoryServices.length > 0);

  return (
    <DropdownMenu>
      {/* S'ouvre aussi au survol ; le délai de fermeture laisse le temps de
          rejoindre le panneau. */}
      <DropdownMenuTrigger
        openOnHover
        delay={80}
        closeDelay={150}
        className="group/trigger flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:focus-ring data-popup-open:text-foreground"
      >
        {t("Site.nav.services")}
        <ChevronDown
          className="size-3.5 transition-transform group-hover/trigger:rotate-180 group-data-popup-open/trigger:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className="w-[42rem] max-w-[calc(100vw-2rem)] space-y-2 p-3"
      >
        {columns.map(({ category, categoryServices }) => (
          <DropdownMenuGroup key={category} className="min-w-0">
            <DropdownMenuLabel className="px-2.5 pb-2 pt-1">
              {t(`Catalog.categories.${category}`)}
            </DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-x-2">
              {categoryServices.map((service) => (
                <DropdownMenuItem
                  key={service.slug}
                  render={<Link href={`/services/${service.slug}`} />}
                  className="items-start gap-3 px-2.5 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                    <ServiceGlyph slug={service.slug} className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block leading-snug text-foreground">
                      {service.name}
                    </span>
                    {service.tagline && (
                      <span className="mt-0.5 block text-sm leading-snug font-normal text-muted-foreground">
                        {service.tagline}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
