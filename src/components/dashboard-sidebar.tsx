"use client";

import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AutomerioLogo } from "@/components/brand";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { WorkspaceNav, WorkspaceNavLinks } from "@/components/workspace-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { OrganizationSummary } from "@/lib/organization";

const ROOT = "/dashboard";

export function DashboardSidebar({
  isAdmin,
  activeOrganization,
  organizations,
  openHelpRequestCount,
  name,
  email,
}: {
  isAdmin: boolean;
  activeOrganization: OrganizationSummary;
  organizations: OrganizationSummary[];
  openHelpRequestCount: number;
  name: string;
  email: string;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AutomerioLogo
          href={ROOT}
          className="px-2 py-1 group-data-[collapsible=icon]:justify-center [&>span:last-child]:group-data-[collapsible=icon]:hidden"
        />
        <OrganizationSwitcher active={activeOrganization} organizations={organizations} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <WorkspaceNav
          root={ROOT}
          groups={[
            {
              label: "Pilotage",
              items: [
                { href: ROOT, label: "Vue d'ensemble", icon: LayoutDashboard },
                {
                  href: "/dashboard/prestations",
                  label: "Solutions",
                  icon: Layers,
                  matches: ["/dashboard/services"],
                },
                { href: "/dashboard/calendrier", label: "Calendrier", icon: CalendarDays },
              ],
            },
            {
              label: "Facturation",
              items: [
                { href: "/dashboard/abonnements", label: "Abonnements", icon: CreditCard },
                { href: "/dashboard/paiements", label: "Paiements", icon: Receipt },
              ],
            },
            {
              label: "Compte",
              items: [
                { href: "/dashboard/organisation", label: "Organisation", icon: Users },
                { href: "/dashboard/profile", label: "Profil", icon: UserRound },
              ],
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <WorkspaceNavLinks
          root={ROOT}
          items={[
            {
              href: "/dashboard/aide",
              label: "Aide",
              icon: LifeBuoy,
              badge: openHelpRequestCount,
            },
            ...(isAdmin
              ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }]
              : []),
          ]}
        />
        <SidebarSeparator className="mx-0" />
        <SidebarUserMenu name={name} email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
