import type { SubscriptionTier } from "@/lib/subscription-pricing";

// Crans du curseur de volume : fins là où se choisissent la plupart des
// volumes, puis de plus en plus larges. Sur une échelle linéaire (150 à
// 6 000 min), la plage utile tiendrait dans les premiers pixels de la piste.
// Chaque cran reste un multiple du pas : les boutons − et + gardent la
// précision d'un pas.
export function sliderStops(tier: Pick<SubscriptionTier, "minUnits" | "maxUnits" | "stepUnits">): number[] {
  const { minUnits, maxUnits, stepUnits } = tier;
  const span = maxUnits - minUnits;
  const stops: number[] = [];
  let units = minUnits;
  while (units < maxUnits) {
    stops.push(units);
    const done = (units - minUnits) / span;
    const stride = done < 0.15 ? stepUnits : done < 0.35 ? stepUnits * 2 : stepUnits * 5;
    units = Math.min(maxUnits, units + stride);
  }
  stops.push(maxUnits);
  return stops;
}

// Cran le plus proche d'un volume (un volume réglé au bouton peut tomber entre
// deux crans larges : le curseur se place au plus près).
export function nearestStop(stops: number[], units: number): number {
  let best = 0;
  for (let index = 1; index < stops.length; index++) {
    if (Math.abs(stops[index] - units) < Math.abs(stops[best] - units)) best = index;
  }
  return best;
}
