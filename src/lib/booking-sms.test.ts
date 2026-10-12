import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  sendSms: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findMany: mocks.findMany, update: mocks.update },
    clientService: { findUnique: mocks.findUnique },
  },
}));
vi.mock("@/lib/sms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sms")>()),
  sendSms: mocks.sendSms,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values: Record<string, string>) =>
    `${key}|${Object.values(values).join("|")}`,
}));

import { customerSmsEnabled, sendBookingConfirmationSms, sendBookingReminders } from "./booking-sms";

const service = (configuration: Record<string, unknown> = {}) => ({
  configuration,
  externalPhoneNumber: "+33412345678",
  organization: { name: "Plomberie Lefèvre" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendSms.mockResolvedValue(true);
});

describe("customerSmsEnabled", () => {
  it("envoie par défaut et se coupe avec « off »", () => {
    expect(customerSmsEnabled({})).toBe(true);
    expect(customerSmsEnabled({ customerSms: "on" })).toBe(true);
    expect(customerSmsEnabled({ customerSms: "off" })).toBe(false);
  });
});

describe("sendBookingConfirmationSms", () => {
  it("confirme un rendez-vous avec la date, l'heure et le numéro de la solution", async () => {
    mocks.findUnique.mockResolvedValue(service());
    const startAt = new Date("2026-10-14T12:30:00Z");
    expect(
      await sendBookingConfirmationSms({ clientServiceId: "cs", kind: "appointment", customerPhone: "0612345678", startAt })
    ).toBe(true);
    expect(mocks.sendSms).toHaveBeenCalledWith(
      "0612345678",
      "appointmentConfirmed|Plomberie Lefèvre|mercredi 14 octobre|14:30|04 12 34 56 78"
    );
  });

  it("n'écrit pas à un fixe et respecte le réglage coupé", async () => {
    expect(await sendBookingConfirmationSms({ clientServiceId: "cs", kind: "order", customerPhone: "0145678900" })).toBe(false);
    mocks.findUnique.mockResolvedValue(service({ customerSms: "off" }));
    expect(await sendBookingConfirmationSms({ clientServiceId: "cs", kind: "order", customerPhone: "0612345678" })).toBe(false);
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });
});

describe("sendBookingReminders", () => {
  it("rappelle les rendez-vous de demain et date chaque envoi", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "b1", customerPhone: "0612345678", startAt: new Date("2026-10-13T08:00:00Z"), clientService: service() },
      { id: "b2", customerPhone: "0612345678", startAt: new Date("2026-10-13T09:00:00Z"), clientService: service({ customerSms: "off" }) },
    ]);
    const result = await sendBookingReminders(new Date("2026-10-12T16:00:00Z"));
    expect(result).toEqual({ sent: 1, skipped: 1 });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0].where).toEqual({ id: "b1" });
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.reminderSentAt).toBeNull();
    expect(where.startAt.gte.toISOString()).toBe("2026-10-12T22:00:00.000Z");
  });

  it("ne date pas un rappel que Twilio a refusé", async () => {
    mocks.sendSms.mockResolvedValue(false);
    mocks.findMany.mockResolvedValue([
      { id: "b1", customerPhone: "0612345678", startAt: new Date("2026-10-13T08:00:00Z"), clientService: service() },
    ]);
    expect(await sendBookingReminders(new Date("2026-10-12T16:00:00Z"))).toEqual({ sent: 0, skipped: 1 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
