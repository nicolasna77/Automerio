import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("twilio", () => ({
  default: Object.assign(
    () => ({ incomingPhoneNumbers: { create } }),
    { validateRequest: () => true }
  ),
}));

import { isFrenchE164, PhoneNumberUnavailableError, purchasePhoneNumber } from "./twilio";

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

describe("purchasePhoneNumber", () => {
  beforeEach(() => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC00");
    vi.stubEnv("TWILIO_API_KEY_SID", "SK00");
    vi.stubEnv("TWILIO_API_KEY_SECRET", "secret");
    create.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("achète le numéro demandé sans recherche préalable", async () => {
    create.mockResolvedValue({ sid: "PN1", phoneNumber: "+33123456789" });
    await expect(purchasePhoneNumber("+33123456789")).resolves.toEqual({
      sid: "PN1",
      phoneNumber: "+33123456789",
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: "+33123456789" }));
  });

  it("traduit l'erreur Twilio 21422 en numéro indisponible", async () => {
    create.mockRejectedValue(Object.assign(new Error("PhoneNumber is not available"), { code: 21422 }));
    await expect(purchasePhoneNumber("+33123456789")).rejects.toBeInstanceOf(PhoneNumberUnavailableError);
  });

  it("laisse remonter les autres erreurs Twilio", async () => {
    const other = Object.assign(new Error("Authenticate"), { code: 20003 });
    create.mockRejectedValue(other);
    await expect(purchasePhoneNumber("+33123456789")).rejects.toBe(other);
  });

  it("refuse un numéro non français sans appeler Twilio", async () => {
    await expect(purchasePhoneNumber("+442079460958")).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
