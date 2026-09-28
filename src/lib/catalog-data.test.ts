import { describe, expect, it } from "vitest";
import { CATALOG, catalogSyncFields } from "./catalog-data";
import { readSubscriptionTier } from "./subscription-pricing";

const personnalisables = CATALOG.filter((service) => service.maxUsageUnits != null);
const fixes = CATALOG.filter((service) => service.maxUsageUnits == null);

describe("catalogSyncFields", () => {
  it("porte les bornes du curseur sur une solution deja en base", () => {
    for (const service of personnalisables) {
      const champs = catalogSyncFields(service);
      expect(champs.maxUsageUnits, service.slug).toBe(service.maxUsageUnits);
      expect(champs.usageStepUnits, service.slug).toBe(service.usageStepUnits);
      expect(champs.extraUnitPriceCents, service.slug).toBe(service.extraUnitPriceCents);
    }
  });

  it("efface les bornes d'une solution qui n'est plus personnalisable", () => {
    for (const service of fixes) {
      const champs = catalogSyncFields(service);
      expect(champs.maxUsageUnits, service.slug).toBeNull();
      expect(champs.usageStepUnits, service.slug).toBeNull();
      expect(champs.extraUnitPriceCents, service.slug).toBeNull();
    }
  });
});

describe("CATALOG", () => {
  it("decrit au moins une solution personnalisable", () => {
    expect(personnalisables.length).toBeGreaterThan(0);
  });

  it("donne des bornes lisibles a chaque solution personnalisable", () => {
    for (const service of personnalisables) {
      expect(
        readSubscriptionTier({
          monthlyPriceCents: service.monthlyPriceCents,
          includedUsageUnits: service.includedUsageUnits,
          usageUnit: service.usageUnit,
          maxUsageUnits: service.maxUsageUnits ?? null,
          usageStepUnits: service.usageStepUnits ?? null,
          extraUnitPriceCents: service.extraUnitPriceCents ?? null,
        }),
        service.slug
      ).not.toBeNull();
    }
  });

  it("vend la minute ajoutee moins cher que le depassement", () => {
    for (const service of personnalisables) {
      expect(service.extraUnitPriceCents!, service.slug).toBeLessThan(
        service.overageUnitPriceCents!
      );
    }
  });
});
