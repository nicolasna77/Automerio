import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendSms: vi.fn(), checkRateLimit: vi.fn() }));

vi.mock("@/lib/sms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sms")>()),
  sendSms: mocks.sendSms,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values: Record<string, string>) => `${key}|${values.company}`,
}));

import { sendMissedCallSms } from "./missed-call-sms";

const clientService = (configuration: Record<string, unknown> = {}) => ({
  id: "cs",
  configuration,
  organization: { name: "Plomberie Lefèvre" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendSms.mockResolvedValue(true);
  mocks.checkRateLimit.mockResolvedValue(true);
});

describe("sendMissedCallSms", () => {
  it("écrit au mobile de l'appelant au nom de l'entreprise", async () => {
    expect(await sendMissedCallSms({ clientService: clientService(), from: "+33612345678" })).toBe(true);
    expect(mocks.sendSms).toHaveBeenCalledWith("+33612345678", "missedCall|Plomberie Lefèvre");
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("missed-call-sms", "cs:+33612345678", "6 h", 1);
  });

  it("n'écrit ni à un fixe, ni à un numéro masqué, ni si les SMS sont coupés", async () => {
    expect(await sendMissedCallSms({ clientService: clientService(), from: "+33145678900" })).toBe(false);
    expect(await sendMissedCallSms({ clientService: clientService(), from: undefined })).toBe(false);
    expect(await sendMissedCallSms({ clientService: clientService({ customerSms: "off" }), from: "+33612345678" })).toBe(false);
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });

  it("n'écrit qu'une fois par appelant sur la période", async () => {
    mocks.checkRateLimit.mockResolvedValue(false);
    expect(await sendMissedCallSms({ clientService: clientService(), from: "+33612345678" })).toBe(false);
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });
});
