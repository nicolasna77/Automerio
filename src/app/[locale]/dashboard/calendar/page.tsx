import { titleMetadata } from "@/i18n/metadata";
import { getTranslations } from "next-intl/server";
import { formatFrenchPhone } from "@/lib/phone-format";
import { requireActiveOrganization } from "@/lib/organization";
import { db } from "@/lib/db";
import { calendarWindow, toCalendarBookings } from "@/lib/bookings";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("calendar");

export default async function CalendrierPage() {
  const [{ active: organization }, t] = await Promise.all([
    requireActiveOrganization(),
    getTranslations("Dashboard.calendar"),
  ]);

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
    subtitle: (b) =>
      t("subtitle", { service: b.clientService.service.name, phone: formatFrenchPhone(b.customerPhone) }),
    isSynced: (b) => !b.clientService.calendarConnection || Boolean(b.googleEventId),
  });

  return (
    <PageShell size="full">
      <PageHeader
        title={t("title")}
        description={t("description")}
        className="mb-5 shrink-0"
      />

      {telephonyServices === 0 && bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/dashboard/services/activate/prise-rdv-telephone" className={buttonVariants()}>
              {t("emptyCta")}
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
