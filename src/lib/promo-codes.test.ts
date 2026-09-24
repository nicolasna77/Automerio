import { describe, expect, it } from "vitest";
import { formatCentsExcludingVat } from "./vat";
import { formatCents } from "@/lib/catalog";
import {
  allowedServiceSlugs,
  applyDiscount,
  describeDiscount,
  firstPaymentCents,
  normalizePromoCode,
  parsePromoCodeInput,
  redeemabilityProblem,
  type DiscountRule,
  type PromoCodeFormInput,
  type PromotionCodeLike,
} from "./promo-codes";

const NBSP = " ";
const percent = (p: number, duration: DiscountRule["duration"] = "once", months: number | null = null): DiscountRule => ({
  percentOff: p,
  amountOffCents: null,
  duration,
  durationInMonths: months,
});
const fixed = (cents: number, duration: DiscountRule["duration"] = "once", months: number | null = null): DiscountRule => ({
  percentOff: null,
  amountOffCents: cents,
  duration,
  durationInMonths: months,
});

describe("normalizePromoCode", () => {
  it("ignore la casse et les espaces autour", () => {
    expect(normalizePromoCode("  bienvenue20 ")).toBe("BIENVENUE20");
  });
});

describe("applyDiscount", () => {
  const first = firstPaymentCents({ monthlyPriceCents: 5900 });

  it("prend le premier mois d'abonnement, sans frais de mise en place", () => {
    expect(first).toBe(5900);
  });

  it("applique un pourcentage au premier paiement, comme Stripe", () => {
    expect(applyDiscount(first, percent(20))).toBe(4720);
  });

  it("retranche un montant fixe du total, comme Stripe", () => {
    expect(applyDiscount(first, fixed(1000))).toBe(4900);
  });

  it("ne descend jamais sous zéro", () => {
    expect(applyDiscount(3000, fixed(5000))).toBe(0);
  });
});

describe("describeDiscount", () => {
  it("précise qu'un pourcentage porte sur la mise en place", () => {
    expect(describeDiscount(percent(20))).toBe(
      `−20${NBSP}% sur le premier paiement`
    );
  });

  it("ne le précise pas quand il n'y a pas de mise en place", () => {
    expect(describeDiscount(percent(20))).toBe(
      `−20${NBSP}% sur le premier paiement`
    );
  });

  it("n'en parle pas pour un montant fixe, qui se retranche du total", () => {
    expect(describeDiscount(fixed(5000))).toBe(
      `−${formatCents(5000)} TTC (−${formatCentsExcludingVat(5000)} HT) sur le premier paiement`
    );
  });

  it("annonce une durée en mois", () => {
    expect(describeDiscount(percent(20, "repeating", 3))).toBe(
      `−20${NBSP}% pendant 3 mois`
    );
    expect(describeDiscount(fixed(1000, "repeating", 3))).toBe(
      `−${formatCents(1000)} TTC (−${formatCentsExcludingVat(1000)} HT) sur chacun des 3 premiers paiements`
    );
  });

  it("traite une durée d'un mois comme un premier paiement", () => {
    expect(describeDiscount(percent(10, "repeating", 1))).toBe(
      `−10${NBSP}% sur le premier paiement`
    );
  });

  it("annonce une remise permanente", () => {
    expect(describeDiscount(percent(15, "forever"))).toBe(
      `−15${NBSP}% sur tous les paiements`
    );
  });


  it("écrit les décimales à la française", () => {
    expect(describeDiscount(percent(12.5))).toBe(
      `−12,5${NBSP}% sur le premier paiement`
    );
  });
});

describe("allowedServiceSlugs", () => {
  it("vaut « toutes les solutions » sans restriction", () => {
    expect(allowedServiceSlugs(null)).toBeNull();
    expect(allowedServiceSlugs({})).toBeNull();
    expect(allowedServiceSlugs({ services: "  " })).toBeNull();
  });

  it("lit une liste, en tolérant les espaces", () => {
    expect(allowedServiceSlugs({ services: "assistant-whatsapp, assistant-instagram" })).toEqual([
      "assistant-whatsapp",
      "assistant-instagram",
    ]);
  });
});

describe("redeemabilityProblem", () => {
  const NOW = Date.UTC(2026, 8, 10);
  const valid: PromotionCodeLike = {
    expires_at: null,
    max_redemptions: null,
    times_redeemed: 0,
    metadata: null,
    coupon: { valid: true },
  };

  it("accepte un code valable", () => {
    expect(redeemabilityProblem(valid, "assistant-whatsapp", NOW)).toBeNull();
  });

  it("refuse un code dont le coupon n'est plus valable", () => {
    expect(redeemabilityProblem({ ...valid, coupon: { valid: false } }, "x", NOW)).toBe(
      "Ce code n'est plus valable."
    );
  });

  it("refuse un code expiré", () => {
    expect(redeemabilityProblem({ ...valid, expires_at: NOW / 1000 - 1 }, "x", NOW)).toBe(
      "Ce code a expiré."
    );
  });

  it("refuse un code épuisé", () => {
    expect(
      redeemabilityProblem({ ...valid, max_redemptions: 3, times_redeemed: 3 }, "x", NOW)
    ).toBe("Ce code a déjà servi le nombre de fois prévu.");
  });

  it("refuse un code réservé à d'autres solutions", () => {
    const restricted = { ...valid, metadata: { services: "assistant-instagram" } };
    expect(redeemabilityProblem(restricted, "assistant-whatsapp", NOW)).toBe(
      "Ce code ne s'applique pas à cette solution."
    );
    expect(redeemabilityProblem(restricted, "assistant-instagram", NOW)).toBeNull();
  });
});

describe("parsePromoCodeInput", () => {
  const NOW = Date.UTC(2026, 8, 10);
  const base: PromoCodeFormInput = {
    code: "bienvenue20",
    kind: "percent",
    value: 20,
    duration: "once",
    durationInMonths: null,
    expiresAtMs: null,
    maxRedemptions: null,
    firstTimeOnly: false,
    serviceSlugs: [],
  };

  it("normalise le code et construit la règle", () => {
    const result = parsePromoCodeInput(base, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        code: "BIENVENUE20",
        rule: { percentOff: 20, amountOffCents: null, duration: "once", durationInMonths: null },
        expiresAt: null,
        maxRedemptions: null,
        firstTimeOnly: false,
        serviceSlugs: [],
      },
    });
  });

  it("convertit un montant en centimes, sans erreur d'arrondi", () => {
    const result = parsePromoCodeInput({ ...base, kind: "amount", value: 19.99 }, NOW);
    expect(result.ok && result.value.rule.amountOffCents).toBe(1999);
  });

  it("convertit l'expiration en secondes, l'unité de Stripe", () => {
    const result = parsePromoCodeInput({ ...base, expiresAtMs: NOW + 86_400_000 }, NOW);
    expect(result.ok && result.value.expiresAt).toBe((NOW + 86_400_000) / 1000);
  });

  it.each([
    [{ code: "ab" }, "3 à 30 caractères"],
    [{ code: "code avec espace" }, "3 à 30 caractères"],
    [{ value: 0 }, "pourcentage"],
    [{ value: 120 }, "pourcentage"],
    [{ kind: "amount" as const, value: 0 }, "montant"],
    [{ duration: "repeating" as const, durationInMonths: null }, "entre 1 et 36 mois"],
    [{ duration: "repeating" as const, durationInMonths: 40 }, "entre 1 et 36 mois"],
    [{ expiresAtMs: NOW - 1 }, "futur"],
    [{ maxRedemptions: 0 }, "entier positif"],
    [{ maxRedemptions: 2.5 }, "entier positif"],
  ])("refuse %o", (override, message) => {
    const result = parsePromoCodeInput({ ...base, ...override }, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });

  it("ne garde la durée en mois que pour une remise répétée", () => {
    const result = parsePromoCodeInput({ ...base, durationInMonths: 6 }, NOW);
    expect(result.ok && result.value.rule.durationInMonths).toBeNull();
  });

  it("dédoublonne les solutions", () => {
    const result = parsePromoCodeInput(
      { ...base, serviceSlugs: ["assistant-whatsapp", "assistant-whatsapp"] },
      NOW
    );
    expect(result.ok && result.value.serviceSlugs).toEqual(["assistant-whatsapp"]);
  });
});

describe("formatCents", () => {
  it("écrit deux décimales dès qu'il y a des centimes", () => {
    expect(formatCents(78320)).toBe("783,20 €");
    expect(formatCents(1999)).toBe("19,99 €");
  });

  it("n'en écrit aucune pour un montant rond", () => {
    expect(formatCents(45000)).toBe("450 €");
  });
});
