import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../messages/fr.json";
import { createPriceFormatter } from "./price-format";
import { calculateMonthlyPriceCents, readSubscriptionTier } from "./subscription-pricing";
import { overageCents, readClientUsageCap, readUsageCap, type UsageCap } from "./usage-cap";

const messaging = {
  monthlyPriceCents: 800,
  includedUsageUnits: 3000,
  usageUnit: "MESSAGE" as const,
  overageUnitPriceCents: 25,
  maxUsageUnits: 30000,
  usageStepUnits: 1000,
  extraUnitPriceCents: 24,
};
const cap = readUsageCap(messaging) as UsageCap;
const price = createPriceFormatter(
  createTranslator({ locale: "fr", messages, namespace: "Price" }),
  "fr-FR"
);

describe("quota des messageries", () => {
  it("facture le dépassement par tranche de 100 réponses entamée", () => {
    expect(overageCents(3000, cap)).toBe(0);
    expect(overageCents(3001, cap)).toBe(25);
    expect(overageCents(3100, cap)).toBe(25);
    expect(overageCents(3150, cap)).toBe(50);
  });

  it("calcule le prix du curseur par tranche de 100 réponses", () => {
    const tier = readSubscriptionTier(messaging)!;
    expect(calculateMonthlyPriceCents(tier, 3000)).toBe(800);
    expect(calculateMonthlyPriceCents(tier, 5000)).toBe(800 + 20 * 24);
    expect(calculateMonthlyPriceCents(tier, 30000)).toBe(800 + 270 * 24);
  });

  it("applique le quota du catalogue à un abonnement souscrit avant le quota", () => {
    expect(readClientUsageCap({ includedUsageUnits: null }, messaging)?.includedUnits).toBe(3000);
    expect(readClientUsageCap({ includedUsageUnits: 5000 }, messaging)?.includedUnits).toBe(5000);
  });

  it("affiche le forfait en réponses et le prix par 100", () => {
    expect(price.usageCap(cap)).toBe(
      "3 000 réponses incluses, puis 0,25 € TTC (0,21 € HT) les 100 réponses"
    );
    expect(price.usageUnits(1, "MESSAGE")).toBe("1 réponse");
    expect(price.perUnit(24, "MESSAGE")).toBe("0,24 € TTC (0,20 € HT) les 100 réponses");
  });
});
