"use client";

import { useTranslations } from "next-intl";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Layers,
  LifeBuoy,
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
  pendingCallbackCount = 0,
  showCalendar = true,
  name,
  email,
}: {
  isAdmin: boolean;
  activeOrganization: OrganizationSummary;
  organizations: OrganizationSummary[];
  openHelpRequestCount: number;
  pendingCallbackCount?: number;
  // Le calendrier ne sert qu'aux solutions de téléphonie (rendez-vous pris
  // par l'assistant) : masqué pour un client qui n'en a aucune.
  showCalendar?: boolean;
  name: string;
  email: string;
}) {
  const t = useTranslations("Dashboard.nav");
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
              label: t("groups.pilot"),
              items: [
                {
                  href: ROOT,
                  label: t("overview"),
                  icon: LayoutDashboard,
                  badge: pendingCallbackCount,
                  badgeLabel: t("callbacksBadge"),
                },
                {
                  href: "/dashboard/services",
                  label: t("services"),
                  icon: Layers,
                  matches: ["/dashboard/services"],
                },
                ...(showCalendar
                  ? [{ href: "/dashboard/calendar", label: t("calendar"), icon: CalendarDays }]
                  : []),
                // Abonnements et factures : deux onglets d'une même page.
                {
                  href: "/dashboard/subscriptions",
                  label: t("billing"),
                  icon: CreditCard,
                  matches: ["/dashboard/payments"],
                },
              ],
            },
            {
              label: t("groups.account"),
              items: [
                { href: "/dashboard/organization", label: t("organization"), icon: Users },
                { href: "/dashboard/profile", label: t("profile"), icon: UserRound },
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
              href: "/dashboard/help",
              label: t("help"),
              icon: LifeBuoy,
              badge: openHelpRequestCount,
            },
            ...(isAdmin
              ? [{ href: "/admin", label: t("admin"), icon: ShieldCheck }]
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
