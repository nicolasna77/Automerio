"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
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
  badgeLabel?: string;
  matches?: string[];
};

export type WorkspaceNavGroup = {
  label?: string;
  items: WorkspaceNavItem[];
};

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
  const t = useTranslations("Workspace.nav");

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
              {item.badge ? (
                <span className="sr-only">
                  {t("badge", { count: item.badge, label: item.badgeLabel ?? t("pending") })}
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
