import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDemoTwiml,
  demoCallLimits,
  formatFrenchPhone,
  hashPhone,
  normalizeFrenchPhone,
  readDemoCallId,
} from "./demo-call";

describe("normalizeFrenchPhone", () => {
  it("accepte les mobiles et fixes sous toutes leurs formes", () => {
    expect(normalizeFrenchPhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizeFrenchPhone("07.12.34.56.78")).toBe("+33712345678");
    expect(normalizeFrenchPhone("+33 1 23 45 67 89")).toBe("+33123456789");
    expect(normalizeFrenchPhone("0033 9-12-34-56-78")).toBe("+33912345678");
  });

  it("refuse les numeros surtaxes, courts ou etrangers", () => {
    expect(normalizeFrenchPhone("08 99 12 34 56")).toBeNull();
    expect(normalizeFrenchPhone("0800 123 456")).toBeNull();
    expect(normalizeFrenchPhone("3949")).toBeNull();
    expect(normalizeFrenchPhone("+44 20 7946 0958")).toBeNull();
    expect(normalizeFrenchPhone("06 12 34 56")).toBeNull();
    expect(normalizeFrenchPhone("00 12 34 56 78")).toBeNull();
  });
});

describe("formatFrenchPhone", () => {
  it("rend le numero lisible", () => {
    expect(formatFrenchPhone("+33612345678")).toBe("06 12 34 56 78");
  });
});

describe("hashPhone", () => {
  beforeEach(() => vi.stubEnv("BETTER_AUTH_SECRET", "secret-de-test"));
  afterEach(() => vi.unstubAllEnvs());

  it("est stable pour un meme numero et ne le contient pas", () => {
    const hash = hashPhone("+33612345678");
    expect(hash).toBe(hashPhone("+33612345678"));
    expect(hash).not.toContain("612345678");
    expect(hash).not.toBe(hashPhone("+33612345679"));
  });
});

describe("demoCallLimits", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prend les valeurs par defaut quand l'environnement est vide ou invalide", () => {
    vi.stubEnv("DEMO_CALLS_PER_IP_PER_DAY", "abc");
    expect(demoCallLimits()).toEqual({ perIpPerDay: 2, perDay: 30 });
  });

  it("lit les valeurs de l'environnement", () => {
    vi.stubEnv("DEMO_CALLS_PER_IP_PER_DAY", "5");
    vi.stubEnv("DEMO_CALLS_PER_DAY", "100");
    expect(demoCallLimits()).toEqual({ perIpPerDay: 5, perDay: 100 });
  });
});

describe("buildDemoTwiml / readDemoCallId", () => {
  it("transmet l'identifiant de l'essai en en-tete SIP", () => {
    const twiml = buildDemoTwiml("sip:proj_123@sip.api.openai.com;transport=tls", "clx123abc456");
    expect(twiml).toContain(
      "<Sip>sip:proj_123@sip.api.openai.com;transport=tls?X-Automerio-Demo=clx123abc456</Sip>"
    );
  });

  it("echappe l'esperluette quand l'URI porte deja des en-tetes", () => {
    const twiml = buildDemoTwiml("sip:a@b.com?X-Autre=1", "clx123abc456");
    expect(twiml).toContain("?X-Autre=1&amp;X-Automerio-Demo=clx123abc456");
  });

  it("relit l'identifiant, insensible a la casse, et ignore une valeur suspecte", () => {
    expect(readDemoCallId([{ name: "x-automerio-demo", value: "clx123abc456" }])).toBe("clx123abc456");
    expect(readDemoCallId([{ name: "X-Automerio-Demo", value: "'; drop" }])).toBeNull();
    expect(readDemoCallId([{ name: "To", value: "sip:+33612345678@x" }])).toBeNull();
  });
});
