import { afterEach, describe, expect, it, vi } from "vitest";
import { createCalcomBooking, isCalcomSlotFree, readCalcomAccount } from "./calcom";
import { createCalendlyBooking, isCalendlySlotFree, readCalendlyAccount } from "./calendly";
import { SchedulingError, type BookingRequest } from "./types";

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Record<string, { status?: number; body: unknown }>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const key = Object.keys(responses).find((prefix) => url.includes(prefix));
      const response = key ? responses[key] : { status: 404, body: {} };
      return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
    })
  );
  return calls;
}

const bodyOf = (call: Call) => JSON.parse(call.init.body as string);
const headersOf = (call: Call) => call.init.headers as Record<string, string>;

const request: BookingRequest = {
  startAt: new Date("2026-10-06T08:00:00.000Z"),
  customerName: "Claire Vasseur",
  customerPhone: "+33639980318",
  customerEmail: "claire@example.fr",
  notes: "Devis chauffe-eau",
  timeZone: "Europe/Paris",
};

afterEach(() => vi.unstubAllGlobals());

describe("Cal.com", () => {
  it("lit le compte et ses types de rendez-vous visibles", async () => {
    const calls = mockFetch({
      "/me": { body: { data: { username: "plomberie", email: "marc@example.fr" } } },
      "/event-types": {
        body: {
          data: [
            { id: 12, title: "Intervention", lengthInMinutes: 60 },
            { id: 13, title: "Interne", lengthInMinutes: 15, hidden: true },
          ],
        },
      },
    });
    const account = await readCalcomAccount("cal_key");
    expect(account).toEqual({
      accountLabel: "marc@example.fr",
      eventTypes: [{ id: "12", name: "Intervention", durationMinutes: 60, location: null }],
    });
    expect(calls[1].url).toContain("username=plomberie");
    expect(headersOf(calls[1])["cal-api-version"]).toBe("2024-06-14");
    expect(headersOf(calls[1]).Authorization).toBe("Bearer cal_key");
  });

  it("refuse une clé invalide avec un message clair", async () => {
    mockFetch({ "/me": { status: 401, body: {} } });
    await expect(readCalcomAccount("mauvaise")).rejects.toBeInstanceOf(SchedulingError);
  });

  it("ne tient un créneau pour libre que s'il est proposé à l'heure exacte", async () => {
    mockFetch({
      "/slots": {
        body: { data: { "2026-10-06": [{ start: "2026-10-06T10:00:00.000+02:00" }] } },
      },
    });
    const end = new Date("2026-10-06T09:00:00.000Z");
    expect(await isCalcomSlotFree("k", "12", new Date("2026-10-06T08:00:00.000Z"), end)).toBe(true);
    expect(await isCalcomSlotFree("k", "12", new Date("2026-10-06T08:30:00.000Z"), end)).toBe(false);
  });

  it("réserve avec l'appelant, son téléphone et le motif", async () => {
    const calls = mockFetch({ "/bookings": { body: { data: { uid: "bk_1" } } } });
    expect(await createCalcomBooking("k", "12", request)).toBe("bk_1");
    const body = bodyOf(calls[0]);
    expect(body).toMatchObject({
      eventTypeId: 12,
      start: "2026-10-06T08:00:00.000Z",
      attendee: {
        name: "Claire Vasseur",
        email: "claire@example.fr",
        timeZone: "Europe/Paris",
        phoneNumber: "+33639980318",
      },
      metadata: { motif: "Devis chauffe-eau", telephone: "+33639980318" },
    });
    expect(headersOf(calls[0])["cal-api-version"]).toBe("2024-08-13");
  });

  it("n'envoie pas un numéro qui n'est pas au format international", async () => {
    const calls = mockFetch({ "/bookings": { body: { data: { uid: "bk_2" } } } });
    await createCalcomBooking("k", "12", { ...request, customerPhone: "06 12 34 56 78" });
    expect(bodyOf(calls[0]).attendee.phoneNumber).toBeUndefined();
  });
});

describe("Calendly", () => {
  it("lit le compte, ses types actifs et le lieu à reprendre", async () => {
    const calls = mockFetch({
      "/users/me": { body: { resource: { uri: "https://api.calendly.com/users/U1", email: "coach@example.fr" } } },
      "/event_types": {
        body: {
          collection: [
            {
              uri: "https://api.calendly.com/event_types/E1",
              name: "Séance découverte",
              duration: 30,
              active: true,
              locations: [{ kind: "outbound_call" }],
            },
            {
              uri: "https://api.calendly.com/event_types/E2",
              name: "Tour de rôle",
              duration: 45,
              active: true,
              pooling_type: "round_robin",
              locations: [{ kind: "physical", location: "12 rue des Lilas" }],
            },
          ],
        },
      },
    });
    const account = await readCalendlyAccount("tok");
    expect(account.accountLabel).toBe("coach@example.fr");
    expect(account.eventTypes).toEqual([
      {
        id: "https://api.calendly.com/event_types/E1",
        name: "Séance découverte",
        durationMinutes: 30,
        location: { kind: "outbound_call" },
      },
      {
        id: "https://api.calendly.com/event_types/E2",
        name: "Tour de rôle",
        durationMinutes: 45,
        location: null,
      },
    ]);
    expect(calls[1].url).toContain(encodeURIComponent("https://api.calendly.com/users/U1"));
  });

  it("ne tient un créneau pour libre que s'il est disponible à l'heure exacte", async () => {
    mockFetch({
      "/event_type_available_times": {
        body: { collection: [{ status: "available", start_time: "2026-10-06T08:00:00Z" }] },
      },
    });
    const end = new Date("2026-10-06T08:30:00.000Z");
    expect(await isCalendlySlotFree("t", "E1", new Date("2026-10-06T08:00:00.000Z"), end)).toBe(true);
    expect(await isCalendlySlotFree("t", "E1", new Date("2026-10-06T07:00:00.000Z"), end)).toBe(false);
  });

  it("met le téléphone de l'appelant dans un lieu à fournir par l'invité", async () => {
    const calls = mockFetch({ "/invitees": { status: 201, body: { resource: { uri: "inv_1" } } } });
    expect(await createCalendlyBooking("t", "E1", { kind: "outbound_call" }, request)).toBe("inv_1");
    expect(bodyOf(calls[0])).toMatchObject({
      event_type: "E1",
      start_time: "2026-10-06T08:00:00.000Z",
      invitee: { email: "claire@example.fr", timezone: "Europe/Paris", text_reminder_number: "+33639980318" },
      location: { kind: "outbound_call", location: "+33639980318" },
    });
  });

  it("reprend tel quel un lieu fixé par le type de rendez-vous", async () => {
    const calls = mockFetch({ "/invitees": { status: 201, body: { resource: { uri: "inv_2" } } } });
    const physical = { kind: "physical", location: "12 rue des Lilas" };
    await createCalendlyBooking("t", "E3", physical, request);
    expect(bodyOf(calls[0]).location).toEqual(physical);
  });

  it("explique qu'une offre gratuite ne permet pas de réserver", async () => {
    mockFetch({ "/invitees": { status: 403, body: {} } });
    await expect(createCalendlyBooking("t", "E1", null, request)).rejects.toThrow(/offre payante/);
  });
});
