import type { Booking } from "@prisma/client";
import type {
  CalendarBooking,
  UnscheduledBooking,
} from "@/components/bookings-calendar";

const KIND_LABELS: Record<string, string> = {
  appointment: "Rendez-vous",
  order: "Commande",
};

const WINDOW_MONTHS = 12;

export function calendarWindow(): { gte: Date; lte: Date } {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth() - WINDOW_MONTHS, 1),
    lte: new Date(now.getFullYear(), now.getMonth() + WINDOW_MONTHS + 1, 0),
  };
}

export function toCalendarBookings<
  T extends Pick<
    Booking,
    "id" | "kind" | "customerName" | "startAt" | "endAt" | "notes" | "googleEventId"
  >,
>(
  bookings: T[],
  options: { subtitle: (booking: T) => string; isSynced: (booking: T) => boolean }
): { scheduled: CalendarBooking[]; unscheduled: UnscheduledBooking[] } {
  const scheduled: CalendarBooking[] = [];
  const unscheduled: UnscheduledBooking[] = [];

  for (const booking of bookings) {
    if (booking.startAt) {
      scheduled.push({
        id: booking.id,
        date: booking.startAt,
        endDate: booking.endAt,
        title: booking.customerName,
        subtitle: options.subtitle(booking),
        notes: booking.notes,
        synced: options.isSynced(booking),
      });
    } else {
      unscheduled.push({
        id: booking.id,
        title: `${KIND_LABELS[booking.kind] ?? booking.kind} · ${booking.customerName}`,
        subtitle: options.subtitle(booking),
        notes: booking.notes,
      });
    }
  }

  return { scheduled, unscheduled };
}
