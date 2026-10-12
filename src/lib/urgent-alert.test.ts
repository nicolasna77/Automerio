import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ service: vi.fn(), event: vi.fn(), sendSms: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { clientService: { findUnique: mocks.service }, usageEvent: { findUnique: mocks.event } },
}));
vi.mock("@/lib/sms", () => ({ sendSms: mocks.sendSms }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, string>) =>
    values ? `${key}|${Object.values(values).join("|")}` : key,
}));

import { sendUrgentCallAlert } from "./urgent-alert";

const input = { clientServiceId: "cs", usageEventId: "ue", reason: "Fuite sous l'évier", callerName: "Julien Perrin" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendSms.mockResolvedValue(true);
  mocks.event.mockResolvedValue({ metadata: { fromNumber: "+33639980611" } });
});

describe("sendUrgentCallAlert", () => {
  it("prévient le mobile choisi avec le nom, le numéro et le motif", async () => {
    mocks.service.mockResolvedValue({ name: "Standard", configuration: { alertPhone: "06 11 22 33 44" } });
    expect(await sendUrgentCallAlert(input)).toBe(true);
    expect(mocks.sendSms).toHaveBeenCalledWith(
      "06 11 22 33 44",
      "urgentCall|Standard|Julien Perrin|06 39 98 06 11|Fuite sous l'évier"
    );
  });

  it("n'envoie rien sans mobile d'alerte", async () => {
    mocks.service.mockResolvedValue({ name: "Standard", configuration: {} });
    expect(await sendUrgentCallAlert(input)).toBe(false);
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });

  it("signale un numéro masqué et un appelant sans nom", async () => {
    mocks.service.mockResolvedValue({ name: "Standard", configuration: { alertPhone: "0611223344" } });
    mocks.event.mockResolvedValue({ metadata: {} });
    await sendUrgentCallAlert({ ...input, callerName: null });
    expect(mocks.sendSms.mock.calls[0][1]).toBe("urgentCall|Standard|unknownCaller|hiddenNumber|Fuite sous l'évier");
  });
});
