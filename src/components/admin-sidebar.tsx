"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Package,
  ScrollText,
  TicketPercent,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Admin.nav");
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <AutomerioLogo
            href={ROOT}
            className="[&>span:last-child]:group-data-[collapsible=icon]:hidden"
          />
          <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-foreground group-data-[collapsible=icon]:hidden">
            {t("badge")}
          </span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <WorkspaceNav
          root={ROOT}
          groups={[
            {
              label: t("groups.clients"),
              items: [
                { href: ROOT, label: t("overview"), icon: LayoutDashboard },
                { href: "/admin/users", label: t("users"), icon: Users },
                { href: "/admin/waitlist", label: t("waitlist"), icon: ListChecks },
                {
                  href: "/admin/help",
                  label: t("help"),
                  icon: LifeBuoy,
                  badge: openHelpRequestCount,
                },
              ],
            },
            {
              label: t("groups.catalog"),
              items: [
                { href: "/admin/services", label: t("services"), icon: Package },
                { href: "/admin/promo-codes", label: t("promoCodes"), icon: TicketPercent },
                { href: "/admin/marketing", label: t("marketing"), icon: Megaphone },
              ],
            },
            {
              label: t("groups.tracking"),
              items: [
                { href: "/admin/calendar", label: t("calendar"), icon: CalendarDays },
                { href: "/admin/audit-log", label: t("auditLog"), icon: ScrollText },
              ],
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <WorkspaceNavLinks
          root={ROOT}
          items={[{ href: "/dashboard", label: t("dashboard"), icon: ArrowLeftRight }]}
        />
        <SidebarSeparator className="mx-0" />
        <SidebarUserMenu name={name} email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
