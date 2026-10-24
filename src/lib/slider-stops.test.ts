import { describe, expect, it } from "vitest";
import { nearestStop, sliderStops } from "./slider-stops";

const TELEPHONY = { minUnits: 150, maxUnits: 6000, stepUnits: 50 };

describe("sliderStops", () => {
  const stops = sliderStops(TELEPHONY);

  it("va du minimum au maximum, en croissant", () => {
    expect(stops[0]).toBe(150);
    expect(stops.at(-1)).toBe(6000);
    for (let index = 1; index < stops.length; index++) {
      expect(stops[index]).toBeGreaterThan(stops[index - 1]);
    }
  });

  it("ne propose que des volumes vendus (multiples du pas)", () => {
    for (const units of stops) expect((units - 150) % 50).toBe(0);
  });

  it("garde le pas fin sur la plage la plus courante", () => {
    expect(stops.filter((units) => units <= 600)).toEqual([150, 200, 250, 300, 350, 400, 450, 500, 550, 600]);
    // 150 à 600 min occupent au moins un cinquième de la piste (7,7 % sur
    // une échelle linéaire).
    expect(stops.indexOf(600) / (stops.length - 1)).toBeGreaterThanOrEqual(0.2);
  });
});

describe("nearestStop", () => {
  it("place un volume réglé au bouton sur le cran le plus proche", () => {
    const stops = [1000, 1100, 1200];
    expect(nearestStop(stops, 1100)).toBe(1);
    expect(nearestStop(stops, 1140)).toBe(1);
    expect(nearestStop(stops, 1160)).toBe(2);
  });
});
