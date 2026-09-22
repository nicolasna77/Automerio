import { describe, expect, it } from "vitest";
import {
  VAT_PERCENTAGE,
  centsExcludingVat,
  excludingVatSuffix,
  formatCentsExcludingVat,
  formatCentsWithVat,
  formatPriceExcludingVat,
  formatPriceWithVat,
} from "./vat";

describe("centsExcludingVat", () => {
  it("retire la TVA d'un montant rond", () => {
    expect(centsExcludingVat(90000)).toBe(75000);
  });

  it("arrondit au centime le plus proche", () => {
    // 7900 / 1,2 = 6583,33…
    expect(centsExcludingVat(7900)).toBe(6583);
  });

  it("laisse la gratuite gratuite", () => {
    expect(centsExcludingVat(0)).toBe(0);
  });

  it("tient sur les micro-montants, comme une minute d'appel", () => {
    expect(centsExcludingVat(30)).toBe(25);
  });

  it("ne s'ecarte jamais du TTC de plus d'un centime une fois la TVA remise", () => {
    for (let ttc = 0; ttc <= 200000; ttc += 7) {
      const ht = centsExcludingVat(ttc);
      const retour = Math.round(ht * (1 + VAT_PERCENTAGE / 100));
      expect(Math.abs(retour - ttc)).toBeLessThanOrEqual(1);
    }
  });

  it("ne depasse jamais le montant TTC", () => {
    for (const ttc of [1, 30, 99, 4900, 5900, 7900, 45000, 90000]) {
      expect(centsExcludingVat(ttc)).toBeLessThanOrEqual(ttc);
    }
  });
});

describe("formatCentsExcludingVat", () => {
  it("n'affiche pas de decimales inutiles", () => {
    expect(formatCentsExcludingVat(90000)).toBe("750 €");
  });

  it("garde les centimes quand la division en cree", () => {
    expect(formatCentsExcludingVat(7900)).toBe("65,83 €");
  });
});

describe("formatCentsWithVat", () => {
  it("met le TTC en avant et le HT entre parentheses", () => {
    expect(formatCentsWithVat(7900)).toBe("79 € TTC (65,83 € HT)");
  });

  it("traite le montant rond sans decimales des deux cotes", () => {
    expect(formatCentsWithVat(90000)).toBe("900 € TTC (750 € HT)");
  });
});

describe("excludingVatSuffix", () => {
  it("compose la mention qui suit un montant mis en avant", () => {
    expect(excludingVatSuffix(7900)).toBe("soit 65,83 € HT");
  });
});

describe("formatPriceExcludingVat", () => {
  it("retire la TVA des deux montants du modele hybride", () => {
    expect(formatPriceExcludingVat(90000, 7900)).toBe("750 € + 65,83 €/mois");
  });

  it("n'affiche que l'abonnement quand il n'y a pas de mise en place", () => {
    expect(formatPriceExcludingVat(null, 7900)).toBe("65,83 €/mois");
  });
});

describe("formatPriceWithVat", () => {
  it("compose les deux formes sur une ligne", () => {
    expect(formatPriceWithVat(90000, 7900)).toBe(
      "900 € + 79 €/mois TTC (750 € + 65,83 €/mois HT)"
    );
  });

  it("laisse le tiret cadratin quand il n'y a aucun prix", () => {
    expect(formatPriceWithVat(null, null)).toBe("—");
  });
});
