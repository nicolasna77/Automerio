import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/twilio", () => ({ sendTwilioSms: send }));

import { sendSms, smsRecipient, smsSender } from "./sms";

afterEach(() => {
  vi.unstubAllEnvs();
  send.mockReset();
});

describe("smsRecipient", () => {
  it("accepte un mobile français, sous toutes ses écritures", () => {
    expect(smsRecipient("06 12 34 56 78")).toBe("+33612345678");
    expect(smsRecipient("+33712345678")).toBe("+33712345678");
  });

  it("refuse un fixe, un numéro étranger ou une valeur vide", () => {
    expect(smsRecipient("01 23 45 67 89")).toBeNull();
    expect(smsRecipient("+447700900123")).toBeNull();
    expect(smsRecipient("")).toBeNull();
    expect(smsRecipient(null)).toBeNull();
  });
});

describe("smsSender", () => {
  it("lit un nom d'expéditeur valide", () => {
    vi.stubEnv("TWILIO_SMS_SENDER", "Automerio");
    expect(smsSender()).toBe("Automerio");
  });

  it("refuse un nom trop long ou sans lettre", () => {
    vi.stubEnv("TWILIO_SMS_SENDER", "AutomerioPlus");
    expect(smsSender()).toBeNull();
    vi.stubEnv("TWILIO_SMS_SENDER", "1234");
    expect(smsSender()).toBeNull();
  });
});

describe("sendSms", () => {
  it("n'envoie rien sans expéditeur configuré", async () => {
    vi.stubEnv("TWILIO_SMS_SENDER", "");
    expect(await sendSms("0612345678", "Bonjour")).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("envoie au format E.164 et tronque un texte trop long", async () => {
    vi.stubEnv("TWILIO_SMS_SENDER", "Automerio");
    send.mockResolvedValue("SM1");
    expect(await sendSms("06 12 34 56 78", "x".repeat(500))).toBe(true);
    expect(send).toHaveBeenCalledWith({ to: "+33612345678", from: "Automerio", body: "x".repeat(320) });
  });

  it("ne lève pas d'erreur si Twilio refuse", async () => {
    vi.stubEnv("TWILIO_SMS_SENDER", "Automerio");
    send.mockRejectedValue(new Error("refus"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendSms("0612345678", "Bonjour")).toBe(false);
  });
});
