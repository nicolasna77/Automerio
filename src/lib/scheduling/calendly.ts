import {
  SchedulingError,
  type BookingRequest,
  type EventLocation,
  type EventTypeOption,
  type ProviderAccount,
} from "./types";

// API v2 de Calendly, avec un jeton d'accès personnel. La réservation par
// API (POST /invitees) est réservée aux offres payantes (Standard et plus) :
// l'offre gratuite reçoit un 403.
const API = "https://api.calendly.com";

// Lieux où l'invité fournit l'information : on y met le téléphone de l'appelant.
const INVITEE_PROVIDED_LOCATIONS = new Set(["outbound_call", "ask_invitee"]);

async function call<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401) {
    throw new SchedulingError("Calendly refuse ce jeton. Vérifiez-le, puis réessayez.");
  }
  if (res.status === 403 && path === "/invitees") {
    throw new SchedulingError(
      "La réservation par Calendly demande une offre payante (Standard ou plus)."
    );
  }
  if (!res.ok) throw new Error(`Calendly ${path} : ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

type CalendlyEventType = {
  uri: string;
  name: string;
  duration: number;
  active: boolean;
  pooling_type?: string | null;
  locations?: EventLocation[] | null;
};

export async function readCalendlyAccount(token: string): Promise<ProviderAccount> {
  const me = await call<{ resource: { uri: string; email: string } }>(token, "/users/me");
  const params = new URLSearchParams({ user: me.resource.uri, active: "true", count: "100" });
  const { collection } = await call<{ collection: CalendlyEventType[] }>(
    token,
    `/event_types?${params.toString()}`
  );
  const eventTypes: EventTypeOption[] = collection
    .filter((eventType) => eventType.active)
    .map((eventType) => ({
      id: eventType.uri,
      name: eventType.name,
      durationMinutes: eventType.duration,
      location: bookableLocation(eventType),
    }));
  return { accountLabel: me.resource.email, eventTypes };
}

// Le lieu à renvoyer à la réservation : aucun pour un tour de rôle (Calendly
// l'interdit) ou un type sans lieu, sinon le premier lieu du type.
function bookableLocation(eventType: CalendlyEventType): EventLocation | null {
  if (eventType.pooling_type === "round_robin") return null;
  const first = eventType.locations?.[0];
  if (!first?.kind) return null;
  return first.location ? { kind: first.kind, location: first.location } : { kind: first.kind };
}

export async function isCalendlySlotFree(
  token: string,
  eventTypeUri: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const params = new URLSearchParams({
    event_type: eventTypeUri,
    start_time: startAt.toISOString(),
    end_time: endAt.toISOString(),
  });
  const { collection } = await call<{
    collection: { status: string; start_time: string }[];
  }>(token, `/event_type_available_times?${params.toString()}`);
  return collection.some(
    (slot) =>
      slot.status === "available" && new Date(slot.start_time).getTime() === startAt.getTime()
  );
}

export async function createCalendlyBooking(
  token: string,
  eventTypeUri: string,
  location: EventLocation | null,
  request: BookingRequest
): Promise<string> {
  const { resource } = await call<{ resource: { uri: string } }>(token, "/invitees", {
    method: "POST",
    body: {
      event_type: eventTypeUri,
      start_time: request.startAt.toISOString(),
      invitee: {
        name: request.customerName,
        email: request.customerEmail,
        timezone: request.timeZone,
        ...(/^\+\d{8,15}$/.test(request.customerPhone) && {
          text_reminder_number: request.customerPhone,
        }),
      },
      ...(location && {
        location: INVITEE_PROVIDED_LOCATIONS.has(location.kind)
          ? { kind: location.kind, location: request.customerPhone }
          : location,
      }),
    },
  });
  return resource.uri;
}
