export const QUOTA_WARNING_RATIO = 0.8;

// Proche du forfait sans l'avoir dépassé : à partir de 80 % du volume inclus.
// Rien tant que rien n'est consommé (un forfait à 0 unité n'alerte pas à vide).
export function isNearQuota(consumedUnits: number, includedUnits: number): boolean {
  return (
    consumedUnits > 0 &&
    consumedUnits < includedUnits &&
    consumedUnits >= includedUnits * QUOTA_WARNING_RATIO
  );
}
