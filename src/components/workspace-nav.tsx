"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Ce que compte le badge, pour un lecteur d'ecran (« 3 appels a rappeler »). */
  badgeLabel?: string;
  /** Autres sections qui rattachent leurs pages a cette entree. */
  matches?: string[];
};

export type WorkspaceNavGroup = {
  label?: string;
  items: WorkspaceNavItem[];
};

// La racine d'un espace (`/dashboard`, `/admin`) n'est active que sur sa
// propre URL, sans quoi elle resterait allumee sur toutes les pages.
function isActiveItem(pathname: string, item: WorkspaceNavItem, root: string) {
  if (item.href === root) return pathname === root;
  return [item.href, ...(item.matches ?? [])].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

export function WorkspaceNavLinks({
  items,
  root,
}: {
  items: WorkspaceNavItem[];
  root: string;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = isActiveItem(pathname, item, root);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
              render={
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => isMobile && setOpenMobile(false)}
                />
              }
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
              {/* Dans le lien : un lecteur d'ecran l'annonce avec la page, au
                  lieu d'un nombre isole que rien ne rattache au lien. */}
              {item.badge ? (
                <span className="sr-only">
                  , {item.badge} {item.badgeLabel ?? "en attente"}
                </span>
              ) : null}
            </SidebarMenuButton>
            {item.badge ? (
              <SidebarMenuBadge aria-hidden="true">{item.badge}</SidebarMenuBadge>
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function WorkspaceNav({
  groups,
  root,
}: {
  groups: WorkspaceNavGroup[];
  root: string;
}) {
  return groups.map((group, index) => (
    <SidebarGroup key={group.label ?? index}>
      {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <WorkspaceNavLinks items={group.items} root={root} />
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}
