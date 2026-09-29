import { priceBlocks, type UsageUnit } from "@/lib/usage-cap";

export type SubscriptionTier = {
  minUnits: number;
  maxUnits: number;
  stepUnits: number;
  unit: UsageUnit;
  baseMonthlyPriceCents: number;
  extraUnitPriceCents: number;
};

type TierColumns = {
  monthlyPriceCents: number | null;
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  maxUsageUnits: number | null;
  usageStepUnits: number | null;
  extraUnitPriceCents: number | null;
};

export function readSubscriptionTier(service: TierColumns): SubscriptionTier | null {
  const {
    monthlyPriceCents,
    includedUsageUnits,
    usageUnit,
    maxUsageUnits,
    usageStepUnits,
    extraUnitPriceCents,
  } = service;

  if (
    monthlyPriceCents === null ||
    includedUsageUnits === null ||
    usageUnit === null ||
    maxUsageUnits === null ||
    usageStepUnits === null ||
    extraUnitPriceCents === null
  ) {
    return null;
  }
  if (usageStepUnits <= 0 || maxUsageUnits <= includedUsageUnits) return null;

  return {
    minUnits: includedUsageUnits,
    maxUnits: maxUsageUnits,
    stepUnits: usageStepUnits,
    unit: usageUnit,
    baseMonthlyPriceCents: monthlyPriceCents,
    extraUnitPriceCents,
  };
}

export function calculateMonthlyPriceCents(
  tier: SubscriptionTier,
  units: number
): number {
  const chosen = clampToStep(tier, units);
  return tier.baseMonthlyPriceCents + priceBlocks(chosen - tier.minUnits, tier.unit) * tier.extraUnitPriceCents;
}

export function clampToStep(tier: SubscriptionTier, units: number): number {
  if (!Number.isFinite(units)) return tier.minUnits;

  const bounded = Math.min(Math.max(Math.round(units), tier.minUnits), tier.maxUnits);
  const stepsFromMin = Math.round((bounded - tier.minUnits) / tier.stepUnits);
  const onStep = tier.minUnits + stepsFromMin * tier.stepUnits;

  return onStep > tier.maxUnits ? onStep - tier.stepUnits : onStep;
}

export function isValidUnitSelection(tier: SubscriptionTier, units: number): boolean {
  if (!Number.isInteger(units)) return false;
  if (units < tier.minUnits || units > tier.maxUnits) return false;
  return (units - tier.minUnits) % tier.stepUnits === 0;
}

export function tierSteps(tier: SubscriptionTier): number[] {
  const steps: number[] = [];
  for (let units = tier.minUnits; units <= tier.maxUnits; units += tier.stepUnits) {
    steps.push(units);
  }
  return steps;
}
