import { describe, expect, it } from "vitest";
import {
  calculateMonthlyPriceCents,
  clampToStep,
  isValidUnitSelection,
  readSubscriptionTier,
  tierSteps,
  type SubscriptionTier,
} from "./subscription-pricing";

/** Le standard téléphonique tel qu'il est au catalogue. */
const COLUMNS = {
  monthlyPriceCents: 7900,
  includedUsageUnits: 150,
  usageUnit: "MINUTE" as const,
  maxUsageUnits: 500,
  usageStepUnits: 10,
  extraUnitPriceCents: 20,
};

const tier = readSubscriptionTier(COLUMNS) as SubscriptionTier;

describe("readSubscriptionTier", () => {
  it("lit les bornes d'une solution personnalisable", () => {
    expect(tier).toEqual({
      minUnits: 150,
      maxUnits: 500,
      stepUnits: 10,
      unit: "MINUTE",
      baseMonthlyPriceCents: 7900,
      extraUnitPriceCents: 20,
    });
  });

  it("refuse une solution dont une seule borne manque", () => {
    // Un maximum sans pas décrit un curseur dont on ne sait pas lire les crans.
    for (const missing of [
      "maxUsageUnits",
      "usageStepUnits",
      "extraUnitPriceCents",
      "includedUsageUnits",
      "monthlyPriceCents",
      "usageUnit",
    ] as const) {
      expect(readSubscriptionTier({ ...COLUMNS, [missing]: null })).toBeNull();
    }
  });

  it("refuse un pas nul ou négatif", () => {
    expect(readSubscriptionTier({ ...COLUMNS, usageStepUnits: 0 })).toBeNull();
    expect(readSubscriptionTier({ ...COLUMNS, usageStepUnits: -10 })).toBeNull();
  });

  it("refuse un maximum qui n'est pas au-dessus du plancher", () => {
    expect(readSubscriptionTier({ ...COLUMNS, maxUsageUnits: 150 })).toBeNull();
    expect(readSubscriptionTier({ ...COLUMNS, maxUsageUnits: 100 })).toBeNull();
  });
});

describe("calculateMonthlyPriceCents", () => {
  it("au plancher, facture exactement le prix du catalogue", () => {
    // La garantie qui compte : personnaliser ne renchérit pas l'offre existante.
    expect(calculateMonthlyPriceCents(tier, 150)).toBe(7900);
  });

  it("ajoute le prix des minutes supplémentaires", () => {
    expect(calculateMonthlyPriceCents(tier, 200)).toBe(8900);
    expect(calculateMonthlyPriceCents(tier, 300)).toBe(10900);
    expect(calculateMonthlyPriceCents(tier, 500)).toBe(14900);
  });

  it("reste moins cher que le dépassement, ce qui est sa raison d'être", () => {
    // 150 minutes de plus : 30 € à l'avance, contre 45 € en dépassement.
    const enAvance = calculateMonthlyPriceCents(tier, 300) - calculateMonthlyPriceCents(tier, 150);
    const enDepassement = 150 * 30;
    expect(enAvance).toBeLessThan(enDepassement);
  });

  it("ne facture jamais hors des bornes, même sur une valeur aberrante", () => {
    expect(calculateMonthlyPriceCents(tier, -1000)).toBe(7900);
    expect(calculateMonthlyPriceCents(tier, 0)).toBe(7900);
    expect(calculateMonthlyPriceCents(tier, 99_999)).toBe(14900);
    expect(calculateMonthlyPriceCents(tier, Number.NaN)).toBe(7900);
  });
});

describe("clampToStep", () => {
  it("ramène sur le cran le plus proche", () => {
    expect(clampToStep(tier, 154)).toBe(150);
    expect(clampToStep(tier, 156)).toBe(160);
  });

  it("borne en haut et en bas", () => {
    expect(clampToStep(tier, 10)).toBe(150);
    expect(clampToStep(tier, 10_000)).toBe(500);
  });

  it("ne dépasse pas le maximum quand l'écart n'est pas un multiple du pas", () => {
    // 150 → 495 par pas de 100 : le dernier cran tomberait à 550.
    const irregulier = readSubscriptionTier({
      ...COLUMNS,
      maxUsageUnits: 495,
      usageStepUnits: 100,
    }) as SubscriptionTier;
    expect(clampToStep(irregulier, 495)).toBe(450);
    expect(clampToStep(irregulier, 600)).toBe(450);
  });
});

describe("isValidUnitSelection", () => {
  it("accepte les valeurs que le curseur peut produire", () => {
    expect(isValidUnitSelection(tier, 150)).toBe(true);
    expect(isValidUnitSelection(tier, 260)).toBe(true);
    expect(isValidUnitSelection(tier, 500)).toBe(true);
  });

  it("refuse hors des bornes", () => {
    expect(isValidUnitSelection(tier, 140)).toBe(false);
    expect(isValidUnitSelection(tier, 510)).toBe(false);
  });

  it("refuse une valeur entre deux crans", () => {
    // Le cas d'une requête forgée : le prix serait juste, le quota non.
    expect(isValidUnitSelection(tier, 155)).toBe(false);
  });

  it("refuse ce qui n'est pas un entier", () => {
    expect(isValidUnitSelection(tier, 150.5)).toBe(false);
    expect(isValidUnitSelection(tier, Number.NaN)).toBe(false);
    expect(isValidUnitSelection(tier, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("refuse ce que le clamp aurait accepté en le corrigeant", () => {
    // La distinction qui justifie deux fonctions : l'une affiche, l'autre vend.
    expect(clampToStep(tier, 155)).toBe(160);
    expect(isValidUnitSelection(tier, 155)).toBe(false);
  });
});

describe("tierSteps", () => {
  it("énumère les crans du plancher au plafond", () => {
    const steps = tierSteps(tier);
    expect(steps[0]).toBe(150);
    expect(steps.at(-1)).toBe(500);
    expect(steps).toHaveLength(36);
  });

  it("ne produit que des valeurs acceptées à la vente", () => {
    for (const units of tierSteps(tier)) {
      expect(isValidUnitSelection(tier, units)).toBe(true);
    }
  });
});
