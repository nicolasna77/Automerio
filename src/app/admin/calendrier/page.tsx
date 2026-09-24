import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { calendarWindow, toCalendarBookings } from "@/lib/bookings";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Calendrier" };

export default async function AdminCalendrierPage() {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    where: { OR: [{ startAt: calendarWindow() }, { startAt: null }] },
    include: {
      clientService: {
        include: { service: true, organization: true, calendarConnection: true },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const { scheduled, unscheduled } = toCalendarBookings(bookings, {
    subtitle: (b) =>
      `${b.clientService.organization.name} · ${b.clientService.service.name}`,
    isSynced: (b) => !b.clientService.calendarConnection || Boolean(b.googleEventId),
  });

  return (
    <PageShell size="full">
      <PageHeader
        title="Calendrier"
        description="Rendez-vous et commandes pris par téléphone, tous clients confondus."
        className="mb-5 shrink-0"
      />

      <div className="min-h-0 flex-1">
        <BookingsCalendar scheduled={scheduled} unscheduled={unscheduled} />
      </div>
    </PageShell>
  );
}
