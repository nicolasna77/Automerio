import { describe, expect, it } from "vitest";
import {
  formatUsageCap,
  formatUsageUnits,
  overageCents,
  overageUnits,
  readUsageCap,
  usageCapLabelOf,
  usageRatio,
  type UsageCap,
} from "./usage-cap";

const NBSP = " ";
const minutes: UsageCap = { includedUnits: 150, unit: "MINUTE", overageUnitPriceCents: 30 };
const calls: UsageCap = { includedUnits: 100, unit: "CALL", overageUnitPriceCents: 30 };

describe("readUsageCap", () => {
  it("ne lit un plafond que si la quantité et l'unité sont toutes deux là", () => {
    expect(
      readUsageCap({ includedUsageUnits: 150, usageUnit: "MINUTE", overageUnitPriceCents: 30 })
    ).toEqual(minutes);
    expect(
      readUsageCap({ includedUsageUnits: null, usageUnit: "MINUTE", overageUnitPriceCents: 30 })
    ).toBeNull();
    expect(
      readUsageCap({ includedUsageUnits: 150, usageUnit: null, overageUnitPriceCents: 30 })
    ).toBeNull();
  });

  it("traite un dépassement non renseigné comme gratuit", () => {
    expect(
      readUsageCap({ includedUsageUnits: 150, usageUnit: "MINUTE", overageUnitPriceCents: null })
    ).toEqual({ ...minutes, overageUnitPriceCents: 0 });
  });
});

describe("formatUsageCap", () => {
  it("accorde le participe avec l'unité", () => {
    expect(formatUsageCap(minutes)).toBe(
      `150 min incluses, puis 0,30${NBSP}€ TTC (0,25${NBSP}€ HT)/min`
    );
    expect(formatUsageCap(calls)).toBe(
      `100 appels inclus, puis 0,30${NBSP}€ TTC (0,25${NBSP}€ HT)/appel`
    );
  });

  it("met l'unique appel inclus au singulier", () => {
    expect(formatUsageCap({ ...calls, includedUnits: 1 })).toBe(
      `1 appel inclus, puis 0,30${NBSP}€ TTC (0,25${NBSP}€ HT)/appel`
    );
  });

  it("tait le dépassement quand il est gratuit", () => {
    expect(formatUsageCap({ ...minutes, overageUnitPriceCents: 0 })).toBe("150 min incluses");
  });

  it("ne produit aucune étiquette sans plafond", () => {
    expect(
      usageCapLabelOf({ includedUsageUnits: null, usageUnit: null, overageUnitPriceCents: null })
    ).toBeNull();
  });
});

describe("formatUsageUnits", () => {
  it("accorde le pluriel des appels, jamais celui des minutes", () => {
    expect(formatUsageUnits(1, "CALL")).toBe("1 appel");
    expect(formatUsageUnits(3, "CALL")).toBe("3 appels");
    expect(formatUsageUnits(1, "MINUTE")).toBe("1 min");
  });
});

describe("dépassement", () => {
  it("est nul tant que le forfait n'est pas épuisé", () => {
    expect(overageUnits(150, minutes)).toBe(0);
    expect(overageCents(149, minutes)).toBe(0);
  });

  it("se facture à l'unité au-delà", () => {
    expect(overageUnits(163, minutes)).toBe(13);
    expect(overageCents(163, minutes)).toBe(390);
  });

  it("ne facture rien quand le dépassement est gratuit", () => {
    expect(overageCents(200, { ...minutes, overageUnitPriceCents: 0 })).toBe(0);
  });
});

describe("usageRatio", () => {
  it("reste borné à 1 pour que la jauge ne déborde pas", () => {
    expect(usageRatio(75, minutes)).toBe(0.5);
    expect(usageRatio(300, minutes)).toBe(1);
  });

  it("affiche un quota nul comme entièrement consommé", () => {
    expect(usageRatio(0, { ...minutes, includedUnits: 0 })).toBe(1);
  });
});
