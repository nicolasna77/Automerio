"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NavMenu, NavMenuTrigger } from "@/components/nav-menu";
import { TRADE_ICONS } from "@/lib/trade-icons";

export type IndustryMenuItem = { slug: string; name: string; href: string };

// Menu « Pour qui ? » de l'en-tête : une entrée par métier, puis la section
// de l'accueil qui les présente tous.
export function IndustriesMenu({ industries }: { industries: IndustryMenuItem[] }) {
  const t = useTranslations("Site");
  return (
    <NavMenu>
      <NavMenuTrigger>{t("industriesMenu.label")}</NavMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          {industries.map((industry) => {
            const Icon = TRADE_ICONS[industry.slug];
            return (
              <DropdownMenuItem key={industry.slug} render={<Link href={industry.href} />}>
                {Icon && <Icon className="text-primary" aria-hidden="true" />}
                {industry.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/#who-its-for" />}>{t("industriesMenu.all")}</DropdownMenuItem>
      </DropdownMenuContent>
    </NavMenu>
  );
}
