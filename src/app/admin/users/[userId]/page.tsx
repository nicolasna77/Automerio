import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { toCalendarBookings } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { UserAccessCards } from "./user-access-cards";
import { UserSessionsTable, SESSIONS_PAGE_SIZE } from "./user-sessions-table";
import { ClientServiceCard } from "../../client-service-card";
import { ServiceHistory } from "./service-history";
import { LiveRefreshToggle } from "../../live-refresh-toggle";
import { toMyServiceDTO } from "@/app/dashboard/get-my-service";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Détail utilisateur" };

async function loadSessionsPage(userId: string, page: number) {
  const rows = await db.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * SESSIONS_PAGE_SIZE,
    take: SESSIONS_PAGE_SIZE,
  });
  const now = Date.now();
  return rows.map((s) => ({ ...s, expired: s.expiresAt.getTime() <= now }));
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ userId }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const sessionsPage = Math.max(1, Number(pageParam) || 1);

  const [currentSession, user, memberships, sessions, sessionsCount, clientServices, bookings] =
    await Promise.all([
    requireAdmin(),
    db.user.findUnique({ where: { id: userId } }),
    db.member.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
    loadSessionsPage(userId, sessionsPage),
    db.session.count({ where: { userId } }),
    db.clientService.findMany({
      where: { userId },
      include: {
        service: true,
        organization: true,
        events: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.findMany({
      where: { clientService: { userId } },
      include: { clientService: { include: { service: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) notFound();

  const isSelf = user.id === currentSession.user.id;

  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(bookings, {
      subtitle: (b) => `${b.clientService.service.name} · ${b.customerPhone}`,
      isSynced: (b) => Boolean(b.googleEventId),
    });

  return (
    <PageShell size="content">
      <PageHeader
        breadcrumbs={[
          { label: "Utilisateurs", href: "/admin/users" },
          { label: user.name },
        ]}
        title={user.name}
        description={
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {user.email}
            {memberships.length > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Building2 className="size-3.5" aria-hidden="true" />
                {memberships.map((m) => m.organization.name).join(", ")}
              </span>
            )}
          </p>
        }
        actions={
          <>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
              {user.role ?? "CLIENT"}
            </Badge>
            <LiveRefreshToggle />
          </>
        }
        className="mb-0"
      />

      <UserAccessCards user={user} isSelf={isSelf} />
      <UserSessionsTable
        userId={user.id}
        userName={user.name}
        sessions={sessions}
        page={sessionsPage}
        totalPages={Math.max(1, Math.ceil(sessionsCount / SESSIONS_PAGE_SIZE))}
      />
      <section className="mt-10" aria-labelledby="client-services-heading">
        <h2 id="client-services-heading" className="text-lg font-semibold text-foreground">
          Solutions
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Note affichée au client, connexion externe et mise en service.
        </p>
        {clientServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune solution activée.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {clientServices.map((cs) => (
              <ClientServiceCard key={cs.id} cs={cs} />
            ))}
          </ul>
        )}
      </section>
      <ServiceHistory items={clientServices.map(toMyServiceDTO)} />
      {bookings.length > 0 && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-base">
              Rendez-vous et commandes
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[30rem] sm:h-[34rem]">
            <BookingsCalendar
              scheduled={scheduledBookings}
              unscheduled={unscheduledBookings}
            />
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
