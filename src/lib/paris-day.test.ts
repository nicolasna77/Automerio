import { describe, expect, it } from "vitest";
import { parisDayKey, parisDayRange } from "./paris-day";

describe("jours à l'heure de Paris", () => {
  it("donne le jour parisien d'un instant, même tard le soir en UTC", () => {
    // 23 h 30 UTC le 30 septembre = 1 h 30 le 1er octobre à Paris (heure d'été).
    expect(parisDayKey(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
  });

  it("borne un jour d'été de minuit à minuit, heure de Paris", () => {
    expect(parisDayRange("2026-07-14")).toEqual({
      gte: new Date("2026-07-13T22:00:00Z"),
      lt: new Date("2026-07-14T22:00:00Z"),
    });
  });

  it("gère le passage à l'heure d'hiver (journée de 25 heures)", () => {
    const range = parisDayRange("2026-10-25")!;
    expect(range.gte).toEqual(new Date("2026-10-24T22:00:00Z"));
    expect(range.lt).toEqual(new Date("2026-10-25T23:00:00Z"));
  });

  it("refuse une clé invalide", () => {
    expect(parisDayRange("2026-13-01")).toBeNull();
    expect(parisDayRange("hier")).toBeNull();
    expect(parisDayRange("2026-02-30")).toBeNull();
  });
});
