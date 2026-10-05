import { formatCentsWithVat } from "@/lib/vat";

export type UsageUnit = "CALL" | "MINUTE" | "MESSAGE";

export const PRICE_BLOCK_UNITS: Record<UsageUnit, number> = { CALL: 1, MINUTE: 1, MESSAGE: 100 };

export function priceBlocks(units: number, unit: UsageUnit): number {
  return Math.ceil(Math.max(0, units) / PRICE_BLOCK_UNITS[unit]);
}

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

// Nombre avec séparateur de milliers : « 6 000 », pas « 6000 ».
function formatCount(units: number): string {
  return units.toLocaleString("fr-FR");
}

export function formatUsageUnits(units: number, unit: UsageUnit): string {
  if (unit === "MINUTE") return `${formatCount(units)} min`;
  if (unit === "MESSAGE") return `${formatCount(units)} réponse${units === 1 ? "" : "s"}`;
  return `${formatCount(units)} appel${units === 1 ? "" : "s"}`;
}

export function formatPerUnit(cents: number, unit: UsageUnit): string {
  const price = formatCentsWithVat(cents);
  if (unit === "MESSAGE") return `${price} les ${PRICE_BLOCK_UNITS.MESSAGE} réponses`;
  return `${price} ${unit === "MINUTE" ? "la minute" : "l'appel"}`;
}

export function formatUsageCap(cap: UsageCap): string {
  const included =
    cap.unit === "MINUTE"
      ? `${formatCount(cap.includedUnits)} min incluses`
      : cap.unit === "MESSAGE"
        ? `${formatCount(cap.includedUnits)} réponses incluses`
        : `${formatCount(cap.includedUnits)} appel${cap.includedUnits === 1 ? "" : "s"} inclus`;
  if (cap.overageUnitPriceCents <= 0) return included;
  if (cap.unit === "MESSAGE") {
    return `${included}, puis ${formatCentsWithVat(cap.overageUnitPriceCents)} les ${PRICE_BLOCK_UNITS.MESSAGE} réponses`;
  }
  const per = cap.unit === "MINUTE" ? "min" : "appel";
  return `${included}, puis ${formatCentsWithVat(cap.overageUnitPriceCents)}/${per}`;
}

export function readClientUsageCap(
  clientService: { includedUsageUnits: number | null },
  service: ServiceUsageColumns
): UsageCap | null {
  const cap = readUsageCap(service);
  if (!cap) return null;
  // Sans volume enregistré (souscription antérieure au choix du volume) : le
  // quota du catalogue s'applique, y compris aux messageries.
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
  return priceBlocks(overageUnits(consumedUnits, cap), cap.unit) * cap.overageUnitPriceCents;
}

export function usageRatio(consumedUnits: number, cap: UsageCap): number {
  if (cap.includedUnits <= 0) return 1;
  return Math.min(1, consumedUnits / cap.includedUnits);
}
