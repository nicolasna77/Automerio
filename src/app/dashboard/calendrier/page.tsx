import type { Metadata } from "next";
import { requireActiveOrganization } from "@/lib/organization";
import { db } from "@/lib/db";
import { calendarWindow, toCalendarBookings } from "@/lib/bookings";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Calendrier" };

export default async function CalendrierPage() {
  const { active: organization } = await requireActiveOrganization();

  const [bookings, telephonyServices] = await Promise.all([
    db.booking.findMany({
    where: {
      clientService: { organizationId: organization.id },
      OR: [{ startAt: calendarWindow() }, { startAt: null }],
    },
    include: {
      clientService: { include: { service: true, calendarConnection: true } },
    },
    orderBy: { startAt: "asc" },
    }),
    db.clientService.count({
      where: {
        organizationId: organization.id,
        status: { not: "CANCELED" },
        service: { slug: { in: [...TELEPHONY_SERVICE_SLUGS] } },
      },
    }),
  ]);

  const { scheduled, unscheduled } = toCalendarBookings(bookings, {
    subtitle: (b) => `${b.clientService.service.name} · ${b.customerPhone}`,
    isSynced: (b) => !b.clientService.calendarConnection || Boolean(b.googleEventId),
  });

  return (
    <PageShell size="full">
      <PageHeader
        title="Calendrier"
        description="Les rendez-vous et commandes pris par téléphone, toutes solutions confondues."
        className="mb-5 shrink-0"
      />

      {telephonyServices === 0 && bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune solution ne prend encore de rendez-vous"
          description="Activez la prise de rendez-vous ou de commande par téléphone : chaque rendez-vous et chaque commande s'afficheront ici."
          action={
            <Link href="/dashboard/prestations/activer/prise-rdv-telephone" className={buttonVariants()}>
              Activer la prise de rendez-vous
            </Link>
          }
        />
      ) : (
        <div className="min-h-0 flex-1">
          <BookingsCalendar scheduled={scheduled} unscheduled={unscheduled} />
        </div>
      )}
    </PageShell>
  );
}
