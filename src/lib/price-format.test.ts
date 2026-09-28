import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../messages/fr.json";
import { createPriceFormatter } from "./price-format";

const t = createTranslator({ locale: "fr", messages, namespace: "Price" });
const price = createPriceFormatter(t, "fr-FR");

describe("createPriceFormatter", () => {
  it("affiche un prix TTC suivi du HT", () => {
    expect(price.withVat(4900)).toBe("49 € TTC (40,83 € HT)");
  });

  it("affiche le prix mensuel, ou un tiret sans prix", () => {
    expect(price.perMonth(4900)).toBe("49 €/mois");
    expect(price.perMonth(null)).toBe("—");
  });

  it("accorde les appels au pluriel", () => {
    expect(price.usageUnits(1, "CALL")).toBe("1 appel");
    expect(price.usageUnits(3, "CALL")).toBe("3 appels");
    expect(price.usageUnits(300, "MINUTE")).toBe("300 min");
  });

  it("décrit le forfait et le dépassement", () => {
    expect(price.usageCap({ includedUnits: 1, unit: "CALL", overageUnitPriceCents: 0 })).toBe(
      "1 appel inclus"
    );
    expect(price.usageCap({ includedUnits: 300, unit: "MINUTE", overageUnitPriceCents: 30 })).toBe(
      "300 min incluses, puis 0,30 € TTC (0,25 € HT)/min"
    );
  });
});
