import { db } from "@/lib/db";
import { LEGAL_ENTITY } from "@/lib/legal";
import { openSecret } from "@/lib/secret-box";
import { createCalendarEvent, isSlotFree as isGoogleSlotFree } from "@/lib/google-calendar";
import { createCalcomBooking, isCalcomSlotFree } from "./calcom";
import { createCalendlyBooking, isCalendlySlotFree } from "./calendly";
import type { BookingRequest, EventLocation, SchedulingProvider } from "./types";

// L'agenda d'une solution, quel qu'il soit : l'agent vocal vérifie un
// créneau et réserve sans savoir s'il parle à Google, Cal.com ou Calendly.

export type BookingResult = { googleEventId?: string; externalBookingId?: string };

export type Scheduler = {
  provider: SchedulingProvider | "google";
  // Durée imposée par le type de rendez-vous (Cal.com, Calendly), sinon null.
  fixedDurationMinutes: number | null;
  isSlotFree(startAt: Date, durationMinutes: number): Promise<boolean>;
  // null si l'outil a refusé : le rendez-vous reste noté chez Automerio.
  book(request: Omit<BookingRequest, "customerEmail" | "timeZone"> & {
    customerEmail: string | null;
    durationMinutes: number;
  }): Promise<BookingResult | null>;
};

const TIME_ZONE = "Europe/Paris";

// Cal.com et Calendly exigent une adresse e-mail pour chaque réservation.
// Quand l'appelant n'en donne pas, la confirmation part vers une adresse du
// domaine d'Automerio plutôt que vers une adresse inventée.
export const BOOKING_FALLBACK_EMAIL = `rendez-vous@${LEGAL_ENTITY.email.split("@")[1]}`;

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export async function getScheduler(clientServiceId: string): Promise<Scheduler | null> {
  const [scheduling, google] = await Promise.all([
    db.schedulingConnection.findUnique({ where: { clientServiceId } }),
    db.calendarConnection.findUnique({ where: { clientServiceId }, select: { id: true } }),
  ]);

  if (scheduling) {
    const token = openSecret(scheduling.encryptedToken);
    const { eventTypeId, durationMinutes } = scheduling;
    const location = (scheduling.location as EventLocation | null) ?? null;
    const provider = scheduling.provider as SchedulingProvider;

    return {
      provider,
      fixedDurationMinutes: durationMinutes,
      async isSlotFree(startAt) {
        const endAt = minutesAfter(startAt, durationMinutes);
        try {
          return provider === "calcom"
            ? await isCalcomSlotFree(token, eventTypeId, startAt, endAt)
            : await isCalendlySlotFree(token, eventTypeId, startAt, endAt);
        } catch (err) {
          console.error(`[agenda] ${provider} : créneau non vérifié`, err);
          return false;
        }
      },
      async book(request) {
        const full: BookingRequest = {
          ...request,
          customerEmail: request.customerEmail ?? BOOKING_FALLBACK_EMAIL,
          timeZone: TIME_ZONE,
        };
        try {
          const externalBookingId =
            provider === "calcom"
              ? await createCalcomBooking(token, eventTypeId, full)
              : await createCalendlyBooking(token, eventTypeId, location, full);
          return { externalBookingId };
        } catch (err) {
          console.error(`[agenda] ${provider} : réservation refusée`, err);
          return null;
        }
      },
    };
  }

  if (google) {
    return {
      provider: "google",
      fixedDurationMinutes: null,
      isSlotFree: (startAt, durationMinutes) =>
        isGoogleSlotFree(clientServiceId, startAt, minutesAfter(startAt, durationMinutes)),
      async book(request) {
        const googleEventId = await createCalendarEvent(clientServiceId, {
          summary: `RDV : ${request.customerName}`,
          description: [request.notes, `Téléphone : ${request.customerPhone}`]
            .filter(Boolean)
            .join("\n"),
          startAt: request.startAt,
          endAt: minutesAfter(request.startAt, request.durationMinutes),
        });
        return googleEventId ? { googleEventId } : null;
      },
    };
  }

  return null;
}
