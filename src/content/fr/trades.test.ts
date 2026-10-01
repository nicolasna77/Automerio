import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog-data";
import { TRADES } from "./trades";

describe("pages par métier", () => {
  it("a des adresses uniques, sans accent ni espace", () => {
    const slugs = TRADES.map((trade) => trade.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("ne cite que des solutions du catalogue", () => {
    const known = new Set(CATALOG.map((service) => service.slug));
    for (const trade of TRADES) {
      expect(trade.solutions.length).toBeGreaterThan(0);
      for (const solution of trade.solutions) expect(known.has(solution.slug), solution.slug).toBe(true);
    }
  });

  it("n'utilise pas de tiret long et garde des titres courts pour les moteurs", () => {
    for (const trade of TRADES) {
      expect(JSON.stringify(trade)).not.toContain("—");
      expect(trade.metaTitle.length, trade.slug).toBeLessThanOrEqual(70);
      expect(trade.metaDescription.length, trade.slug).toBeLessThanOrEqual(200);
      expect(trade.faq.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("présente l'assistant comme virtuel dans chaque exemple d'appel", () => {
    for (const trade of TRADES) {
      expect(trade.call.turns[0].speaker).toBe("assistant");
      expect(trade.call.turns[0].text).toContain("assistant virtuel");
    }
  });
});
