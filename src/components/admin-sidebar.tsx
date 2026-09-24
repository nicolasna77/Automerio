"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  ScrollText,
  TicketPercent,
  Users,
} from "lucide-react";
import { AutomerioLogo } from "@/components/brand";
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

const ROOT = "/admin";

export function AdminSidebar({
  openHelpRequestCount,
  name,
  email,
}: {
  openHelpRequestCount: number;
  name: string;
  email: string;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <AutomerioLogo
            href={ROOT}
            className="[&>span:last-child]:group-data-[collapsible=icon]:hidden"
          />
          <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-primary uppercase group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <WorkspaceNav
          root={ROOT}
          groups={[
            {
              label: "Clients",
              items: [
                { href: ROOT, label: "Vue d'ensemble", icon: LayoutDashboard },
                { href: "/admin/users", label: "Utilisateurs", icon: Users },
                {
                  href: "/admin/aide",
                  label: "Centre d'aide",
                  icon: LifeBuoy,
                  badge: openHelpRequestCount,
                },
              ],
            },
            {
              label: "Catalogue",
              items: [
                { href: "/admin/services", label: "Solutions", icon: Package },
                { href: "/admin/codes-promo", label: "Codes promo", icon: TicketPercent },
                { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
              ],
            },
            {
              label: "Suivi",
              items: [
                { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays },
                { href: "/admin/journal", label: "Journal", icon: ScrollText },
              ],
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <WorkspaceNavLinks
          root={ROOT}
          items={[{ href: "/dashboard", label: "Tableau de bord", icon: ArrowLeftRight }]}
        />
        <SidebarSeparator className="mx-0" />
        <SidebarUserMenu name={name} email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
