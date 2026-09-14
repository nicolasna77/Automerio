"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Layers, LifeBuoy, Receipt, ShieldCheck, UserRound } from "lucide-react";
import { AutomerioLogo } from "@/components/brand";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { OrganizationSummary } from "@/lib/organization";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/prestations", label: "Solutions", icon: Layers },
  { href: "/dashboard/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/dashboard/paiements", label: "Paiements", icon: Receipt },
  { href: "/dashboard/profile", label: "Profil", icon: UserRound },
  { href: "/dashboard/aide", label: "Aide", icon: LifeBuoy },
];

export function DashboardSidebar({
  isAdmin,
  activeOrganization,
  organizations,
  openHelpRequestCount,
}: {
  isAdmin: boolean;
  activeOrganization: OrganizationSummary;
  organizations: OrganizationSummary[];
  openHelpRequestCount: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AutomerioLogo
          href="/dashboard"
          className="px-2 py-1 group-data-[collapsible=icon]:justify-center [&>span:last-child]:group-data-[collapsible=icon]:hidden"
        />
        <OrganizationSwitcher active={activeOrganization} organizations={organizations} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.href === "/dashboard/aide" && openHelpRequestCount > 0 && (
                      <SidebarMenuBadge>{openHelpRequestCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Administration" render={<Link href="/admin" />}>
                    <ShieldCheck />
                    <span>Administration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
