import type { UsageUnit } from "@/lib/usage-cap";

/**
 * Le prix d'un abonnement dont le client choisit le quota.
 *
 * Tout est ici, rien dans le composant : la tarification doit pouvoir changer
 * sans toucher au curseur, et le serveur doit pouvoir recalculer sans importer
 * d'interface. Le prix envoye par le navigateur n'est jamais cru — il sert a
 * afficher, le serveur seul decide de ce qui sera preleve.
 *
 * Le modele est un palier de base assorti de minutes supplementaires moins
 * cheres que le depassement : rester au minimum coute le prix du catalogue, et
 * acheter a l'avance revient moins cher que de depasser. Les bornes vivent sur
 * la solution, non ici, pour qu'un tarif se change en base sans redeploiement.
 */

/** Les bornes du curseur d'une solution personnalisable. */
export type SubscriptionTier = {
  /** Plancher, et quota compris dans le prix de base. */
  minUnits: number;
  maxUnits: number;
  stepUnits: number;
  unit: UsageUnit;
  /** Prix de la solution au plancher. */
  baseMonthlyPriceCents: number;
  /** Ce que coute une unite ajoutee au-dela du plancher. */
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

/**
 * Les bornes d'une solution, ou `null` si elle n'est pas personnalisable.
 *
 * Toutes les colonnes sont exigees ensemble : un maximum sans pas, ou sans prix
 * a l'unite, decrirait un curseur dont on ne saurait pas lire les crans ni
 * chiffrer les positions. Mieux vaut alors vendre la solution telle quelle.
 */
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

/**
 * Le prix mensuel pour un quota donne.
 *
 * Le quota est d'abord ramene dans les bornes et sur un cran : une valeur hors
 * limites ne doit pas produire un prix hors limites, surtout quand elle vient
 * du navigateur.
 */
export function calculateMonthlyPriceCents(
  tier: SubscriptionTier,
  units: number
): number {
  const chosen = clampToStep(tier, units);
  return tier.baseMonthlyPriceCents + (chosen - tier.minUnits) * tier.extraUnitPriceCents;
}

/** Le quota le plus proche qui tienne dans les bornes et tombe sur un cran. */
export function clampToStep(tier: SubscriptionTier, units: number): number {
  if (!Number.isFinite(units)) return tier.minUnits;

  const bounded = Math.min(Math.max(Math.round(units), tier.minUnits), tier.maxUnits);
  const stepsFromMin = Math.round((bounded - tier.minUnits) / tier.stepUnits);
  const onStep = tier.minUnits + stepsFromMin * tier.stepUnits;

  // Le dernier cran peut depasser le maximum quand l'ecart n'en est pas un
  // multiple : on redescend d'un cran plutot que de vendre au-dela des bornes.
  return onStep > tier.maxUnits ? onStep - tier.stepUnits : onStep;
}

/**
 * Le quota vient-il d'un curseur honnete ?
 *
 * Verifie avant toute commande. `clampToStep` corrigerait silencieusement une
 * valeur trafiquee ; ici on veut la refuser et le dire, pour ne pas facturer
 * autre chose que ce que le client croit avoir choisi.
 */
export function isValidUnitSelection(tier: SubscriptionTier, units: number): boolean {
  if (!Number.isInteger(units)) return false;
  if (units < tier.minUnits || units > tier.maxUnits) return false;
  return (units - tier.minUnits) % tier.stepUnits === 0;
}

/** Les crans du curseur, du plancher au plafond. */
export function tierSteps(tier: SubscriptionTier): number[] {
  const steps: number[] = [];
  for (let units = tier.minUnits; units <= tier.maxUnits; units += tier.stepUnits) {
    steps.push(units);
  }
  return steps;
}
