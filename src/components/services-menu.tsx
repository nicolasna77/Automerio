"use client";

import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import type { ServiceCategory, ServiceMenuItem } from "@/lib/catalog";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

export function ServicesMenu({ services }: { services: ServiceMenuItem[] }) {
  const t = useTranslations();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:focus-ring">
        {t("Site.nav.services")}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {MENU_CATEGORIES.map((category) => ({
          category,
          categoryServices: services.filter((s) => s.category === category),
        }))
          .filter(({ categoryServices }) => categoryServices.length > 0)
          .map(({ category, categoryServices }, index) => (
            <Fragment key={category}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t(`Catalog.categories.${category}`)}
                </DropdownMenuLabel>
                {categoryServices.map((service) => (
                  <DropdownMenuItem
                    key={service.slug}
                    render={<Link href={`/services/${service.slug}`} />}
                  >
                    {service.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </Fragment>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
