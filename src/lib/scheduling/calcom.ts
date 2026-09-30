import {
  SchedulingError,
  type BookingRequest,
  type EventTypeOption,
  type ProviderAccount,
} from "./types";

// API v2 de Cal.com, avec une clé API personnelle (préfixe « cal_ »).
// Chaque route exige sa version dans l'en-tête cal-api-version.
const API = "https://api.cal.com/v2";
const VERSIONS = {
  eventTypes: "2024-06-14",
  slots: "2024-09-04",
  bookings: "2024-08-13",
} as const;

async function call<T>(
  apiKey: string,
  path: string,
  init: { version?: string; method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.version && { "cal-api-version": init.version }),
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new SchedulingError("Cal.com refuse cette clé API. Vérifiez-la, puis réessayez.");
  }
  if (!res.ok) throw new Error(`Cal.com ${path} : ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

type CalEventType = {
  id: number;
  title: string;
  lengthInMinutes: number;
  hidden?: boolean;
};

export async function readCalcomAccount(apiKey: string): Promise<ProviderAccount> {
  const me = await call<{ data: { username: string; email: string } }>(apiKey, "/me");
  const { data } = await call<{ data: CalEventType[] }>(
    apiKey,
    `/event-types?username=${encodeURIComponent(me.data.username)}`,
    { version: VERSIONS.eventTypes }
  );
  const eventTypes: EventTypeOption[] = data
    .filter((eventType) => !eventType.hidden)
    .map((eventType) => ({
      id: String(eventType.id),
      name: eventType.title,
      durationMinutes: eventType.lengthInMinutes,
      location: null,
    }));
  return { accountLabel: me.data.email, eventTypes };
}

// Le créneau est libre si Cal.com le propose exactement à cette heure : ses
// créneaux tiennent déjà compte des disponibilités et des rendez-vous pris.
export async function isCalcomSlotFree(
  apiKey: string,
  eventTypeId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const params = new URLSearchParams({
    eventTypeId,
    start: startAt.toISOString(),
    end: endAt.toISOString(),
  });
  const { data } = await call<{ data: Record<string, { start: string }[]> }>(
    apiKey,
    `/slots?${params.toString()}`,
    { version: VERSIONS.slots }
  );
  return Object.values(data)
    .flat()
    .some((slot) => new Date(slot.start).getTime() === startAt.getTime());
}

export async function createCalcomBooking(
  apiKey: string,
  eventTypeId: string,
  request: BookingRequest
): Promise<string> {
  const { data } = await call<{ data: { uid: string } }>(apiKey, "/bookings", {
    method: "POST",
    version: VERSIONS.bookings,
    body: {
      eventTypeId: Number(eventTypeId),
      start: request.startAt.toISOString(),
      attendee: {
        name: request.customerName,
        email: request.customerEmail,
        timeZone: request.timeZone,
        language: "fr",
        ...(isE164(request.customerPhone) && { phoneNumber: request.customerPhone }),
      },
      metadata: {
        source: "Automerio, appel téléphonique",
        telephone: request.customerPhone.slice(0, 40),
        ...(request.notes && { motif: request.notes.slice(0, 480) }),
      },
    },
  });
  return data.uid;
}

function isE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}
