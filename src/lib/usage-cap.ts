import { formatCentsWithVat } from "@/lib/vat";

export type UsageUnit = "CALL" | "MINUTE";

/** Ce que l'abonnement mensuel comprend, et le prix au-dela. */
export type UsageCap = {
  includedUnits: number;
  unit: UsageUnit;
  overageUnitPriceCents: number;
};

type ServiceUsageColumns = {
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  overageUnitPriceCents: number | null;
};

export function readUsageCap(service: ServiceUsageColumns): UsageCap | null {
  if (service.includedUsageUnits === null || service.usageUnit === null) return null;
  return {
    includedUnits: service.includedUsageUnits,
    unit: service.usageUnit,
    overageUnitPriceCents: service.overageUnitPriceCents ?? 0,
  };
}

/** « 12 min », « 3 appels » — l'unite telle qu'on la montre au client. */
export function formatUsageUnits(units: number, unit: UsageUnit): string {
  if (unit === "MINUTE") return `${units} min`;
  return `${units} appel${units === 1 ? "" : "s"}`;
}

/** L'etiquette lue partout — site public, catalogue, facture, jauge. */
export function formatUsageCap(cap: UsageCap): string {
  const included =
    cap.unit === "MINUTE"
      ? `${cap.includedUnits} min incluses`
      : `${cap.includedUnits} appel${cap.includedUnits === 1 ? "" : "s"} inclus`;
  if (cap.overageUnitPriceCents <= 0) return included;
  const per = cap.unit === "MINUTE" ? "min" : "appel";
  return `${included}, puis ${formatCentsWithVat(cap.overageUnitPriceCents)}/${per}`;
}

/**
 * Le plafond d'une prestation vendue : celui que le client a choisi s'il a pu
 * le faire, sinon celui du catalogue. Lire le catalogue seul montrerait a un
 * client ayant achete 300 minutes le quota par defaut de 150.
 */
export function readClientUsageCap(
  clientService: { includedUsageUnits: number | null },
  service: ServiceUsageColumns
): UsageCap | null {
  const cap = readUsageCap(service);
  if (!cap) return null;
  if (clientService.includedUsageUnits === null) return cap;
  return { ...cap, includedUnits: clientService.includedUsageUnits };
}

export function usageCapLabelOf(service: ServiceUsageColumns): string | null {
  const cap = readUsageCap(service);
  return cap ? formatUsageCap(cap) : null;
}

export function overageUnits(consumedUnits: number, cap: UsageCap): number {
  return Math.max(0, consumedUnits - cap.includedUnits);
}

export function overageCents(consumedUnits: number, cap: UsageCap): number {
  return overageUnits(consumedUnits, cap) * cap.overageUnitPriceCents;
}

/** Part du quota consommee, bornee a 1 : la jauge ne deborde pas. */
export function usageRatio(consumedUnits: number, cap: UsageCap): number {
  if (cap.includedUnits <= 0) return 1;
  return Math.min(1, consumedUnits / cap.includedUnits);
}
