import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getTranslations } from "next-intl/server";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getClientNotifications } from "@/lib/notifications";
import { countPendingCallbacks } from "@/lib/call-callbacks";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { active, organizations }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const [openHelpRequestCount, pendingCallbackCount, notifications, telephonyCount, bookingCount] = await Promise.all([
    db.helpRequest.count({
      where: { organizationId: active.id, status: "OPEN" },
    }),
    countPendingCallbacks(active.id),
    db.user
      .findUnique({
        where: { id: session.user.id },
        select: { notificationsSeenAt: true },
      })
      .then((user) => getClientNotifications(active.id, user?.notificationsSeenAt ?? null)),
    // Même condition que la page Calendrier : une téléphonie en cours, ou
    // des rendez-vous déjà pris (après une résiliation, ils restent visibles).
    db.clientService.count({
      where: {
        organizationId: active.id,
        status: { not: "CANCELED" },
        service: { slug: { in: [...TELEPHONY_SERVICE_SLUGS] } },
      },
    }),
    db.booking.count({ where: { clientService: { organizationId: active.id } }, take: 1 }),
  ]);

  const [tNav, tTitles] = await Promise.all([
    getTranslations("Dashboard.nav"),
    getTranslations("PageTitles"),
  ]);

  return (
    <WorkspaceLayout
      breadcrumbRoot={{ label: tTitles("dashboard"), href: "/dashboard" }}
      breadcrumbPages={{
        "/dashboard": tNav("overview"),
        "/dashboard/services": tNav("services"),
        "/dashboard/services/catalog": tTitles("catalog"),
        "/dashboard/calendar": tNav("calendar"),
        "/dashboard/subscriptions": tNav("billing"),
        "/dashboard/payments": tNav("billing"),
        "/dashboard/organization": tNav("organization"),
        "/dashboard/profile": tNav("profile"),
        "/dashboard/help": tNav("help"),
      }}
      sidebar={
        <DashboardSidebar
          isAdmin={isAdmin(session.user)}
          activeOrganization={active}
          organizations={organizations}
          openHelpRequestCount={openHelpRequestCount}
          pendingCallbackCount={pendingCallbackCount}
          showCalendar={telephonyCount > 0 || bookingCount > 0}
          name={session.user.name}
          email={session.user.email}
        />
      }
      notifications={notifications}
    >
      {children}
    </WorkspaceLayout>
  );
}
