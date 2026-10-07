import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
vi.mock("twilio", () => ({
  default: Object.assign(
    () => ({ availablePhoneNumbers: () => ({ local: { list } }) }),
    { validateRequest: () => true }
  ),
}));

import { isFrenchE164, isNumberStillAvailable, isOffered } from "./twilio";

describe("isFrenchE164", () => {
  it("accepte les numéros français au format E.164", () => {
    expect(isFrenchE164("+33123456789")).toBe(true);
    expect(isFrenchE164("+33987654321")).toBe(true);
  });

  it("refuse les numéros étrangers, mal formés ou nationaux", () => {
    expect(isFrenchE164("+442079460958")).toBe(false);
    expect(isFrenchE164("+33023456789")).toBe(false);
    expect(isFrenchE164("+3312345678")).toBe(false);
    expect(isFrenchE164("+331234567890")).toBe(false);
    expect(isFrenchE164("0123456789")).toBe(false);
    expect(isFrenchE164("+33 1 23 45 67 89")).toBe(false);
    expect(isFrenchE164(undefined)).toBe(false);
  });
});

describe("isOffered", () => {
  it("exige une correspondance exacte", () => {
    const offered = [{ phoneNumber: "+33123456789" }];
    expect(isOffered(offered, "+33123456789")).toBe(true);
    expect(isOffered(offered, "+33123456780")).toBe(false);
  });
});

describe("isNumberStillAvailable", () => {
  beforeEach(() => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC00");
    vi.stubEnv("TWILIO_API_KEY_SID", "SK00");
    vi.stubEnv("TWILIO_API_KEY_SECRET", "secret");
    list.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("interroge Twilio et confirme un numéro toujours proposé", async () => {
    list.mockResolvedValue([{ phoneNumber: "+33123456789" }]);
    await expect(isNumberStillAvailable("+33123456789")).resolves.toBe(true);
    expect(list).toHaveBeenCalledWith({ contains: "33123456789", limit: 5 });
  });

  it("refuse un numéro que Twilio ne propose plus", async () => {
    list.mockResolvedValue([{ phoneNumber: "+33123456780" }]);
    await expect(isNumberStillAvailable("+33123456789")).resolves.toBe(false);
  });

  it("refuse un numéro non français sans interroger Twilio", async () => {
    await expect(isNumberStillAvailable("+442079460958")).resolves.toBe(false);
    expect(list).not.toHaveBeenCalled();
  });
});
