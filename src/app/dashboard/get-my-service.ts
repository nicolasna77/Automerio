import { db } from "@/lib/db";
import type {
  Booking,
  CalendarConnection,
  ClientService,
  Service,
  ServiceEvent,
} from "@prisma/client";
import type {
  BookingDTO,
  Configuration,
  MyServiceDTO,
  ServiceDTO,
  ServiceEventDTO,
} from "@/lib/catalog";
import { readUsageCap } from "@/lib/usage-cap";
import {
  canReadClientService,
  viewerOrganizationIds,
} from "@/lib/client-service-access";

function toBookingDTO(booking: Booking): BookingDTO {
  return {
    id: booking.id,
    kind: booking.kind,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    startAt: booking.startAt,
    endAt: booking.endAt,
    googleEventId: booking.googleEventId,
    notes: booking.notes,
    createdAt: booking.createdAt,
  };
}

function toServiceEventDTO(event: ServiceEvent): ServiceEventDTO {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    createdAt: event.createdAt,
  };
}

export function toMyServiceDTO(
  cs: ClientService & {
    service: Service;
    calendarConnection?: CalendarConnection | null;
    bookings?: Booking[];
    events?: ServiceEvent[];
  }
): MyServiceDTO {
  return {
    clientServiceId: cs.id,
    name: cs.name,
    status: cs.status,
    configuration: (cs.configuration as Configuration) ?? {},
    adminNote: cs.adminNote,
    createdAt: cs.createdAt,
    activatedAt: cs.activatedAt,
    canceledAt: cs.canceledAt,
    paymentFailedAt: cs.paymentFailedAt,
    externalPhoneNumber: cs.externalPhoneNumber,
    calendarConnected: !!cs.calendarConnection,
    whatsappConnected: !!cs.whatsappPhoneNumberId,
    whatsappDisplayNumber: cs.whatsappDisplayNumber,
    facebookConnected: !!cs.facebookPageId,
    facebookPageName: cs.facebookPageName,
    instagramConnected: !!cs.instagramAccountId,
    instagramUsername: cs.instagramUsername,
    bookings: (cs.bookings ?? []).map(toBookingDTO),
    events: (cs.events ?? []).map(toServiceEventDTO),
    service: {
      id: cs.service.id,
      slug: cs.service.slug,
      name: cs.service.name,
      description: cs.service.description,
      category: cs.service.category,
      setupFeeCents: cs.service.setupFeeCents,
      monthlyPriceCents: cs.service.monthlyPriceCents,
      usageCap: readUsageCap(cs.service),
      configFields: (cs.service.configFields as ServiceDTO["configFields"]) ?? [],
      sortOrder: cs.service.sortOrder,
    },
  };
}

export async function getMyService(
  clientServiceId: string,
  userId: string
): Promise<MyServiceDTO | null> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    include: {
      service: true,
      calendarConnection: true,
      bookings: { orderBy: { createdAt: "desc" }, take: 10 },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!clientService) return null;
  const allowed = canReadClientService(clientService, {
    userId,
    organizationIds: await viewerOrganizationIds(userId),
  });
  if (!allowed) return null;
  return toMyServiceDTO(clientService);
}
