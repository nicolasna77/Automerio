import { formatCents, formatPrice } from "@/lib/catalog";

export const VAT_PERCENTAGE = 20;

const VAT_MULTIPLIER = 1 + VAT_PERCENTAGE / 100;

export function centsExcludingVat(inclusiveCents: number): number {
  return Math.round(inclusiveCents / VAT_MULTIPLIER);
}

export function formatCentsExcludingVat(inclusiveCents: number): string {
  return formatCents(centsExcludingVat(inclusiveCents));
}

export function formatCentsWithVat(inclusiveCents: number): string {
  return `${formatCents(inclusiveCents)} TTC (${formatCentsExcludingVat(inclusiveCents)} HT)`;
}

export function excludingVatSuffix(inclusiveCents: number): string {
  return `soit ${formatCentsExcludingVat(inclusiveCents)} HT`;
}

export function formatPriceExcludingVat(monthlyPriceCents: number | null): string {
  return formatPrice(monthlyPriceCents === null ? null : centsExcludingVat(monthlyPriceCents));
}

export function formatPriceWithVat(monthlyPriceCents: number | null): string {
  const inclusive = formatPrice(monthlyPriceCents);
  if (inclusive === "—") return inclusive;
  return `${inclusive} TTC (${formatPriceExcludingVat(monthlyPriceCents)} HT)`;
}
