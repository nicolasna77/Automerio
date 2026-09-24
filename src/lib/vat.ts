import { formatCents, formatPrice } from "@/lib/catalog";

/**
 * Taux de TVA applique aux prestations, en pourcentage. Seul endroit ou il est
 * ecrit : `src/lib/stripe-billing.ts` le reprend pour declarer le taux a Stripe,
 * et les pages legales pour l'annoncer au client. Les trois ne peuvent donc pas
 * diverger.
 */
export const VAT_PERCENTAGE = 20;

const VAT_MULTIPLIER = 1 + VAT_PERCENTAGE / 100;

/**
 * Montant hors taxes, en centimes, derive d'un montant TTC.
 *
 * Le sens de la derivation compte : les montants du catalogue sont stockes TTC
 * — c'est ce que Stripe preleve, via un taux declare inclusif — et le HT n'en
 * est qu'une lecture. L'arrondi au centime ne peut donc jamais deplacer la
 * somme facturee, seulement le chiffre affiche a cote.
 */
export function centsExcludingVat(inclusiveCents: number): number {
  return Math.round(inclusiveCents / VAT_MULTIPLIER);
}

/** Le montant hors taxes, formate : « 65,83 € ». */
export function formatCentsExcludingVat(inclusiveCents: number): string {
  return formatCents(centsExcludingVat(inclusiveCents));
}

/**
 * Les deux montants sur une ligne : « 79 € TTC (65,83 € HT) ».
 *
 * Pour les tableaux, les libelles et tout contexte ou les deux prix ne peuvent
 * pas etre empiles. Les blocs qui ont la place mettent le TTC en avant et
 * ajoutent « soit ... HT » en dessous.
 */
export function formatCentsWithVat(inclusiveCents: number): string {
  return `${formatCents(inclusiveCents)} TTC (${formatCentsExcludingVat(inclusiveCents)} HT)`;
}

/** La mention qui accompagne un montant TTC mis en avant : « soit 65,83 € HT ». */
export function excludingVatSuffix(inclusiveCents: number): string {
  return `soit ${formatCentsExcludingVat(inclusiveCents)} HT`;
}

/**
 * La meme forme que `formatPrice`, mais hors taxes : « 65,83 €/mois ».
 * Sert la ligne secondaire des tableaux et des tuiles de statistiques, sous le
 * montant TTC.
 */
export function formatPriceExcludingVat(monthlyPriceCents: number | null): string {
  return formatPrice(monthlyPriceCents === null ? null : centsExcludingVat(monthlyPriceCents));
}

/**
 * Les deux formes du prix sur une ligne : « 79 €/mois TTC (65,83 €/mois HT) ».
 * Pour les rangees ou la mention HT ne peut pas etre empilee sous le montant.
 */
export function formatPriceWithVat(monthlyPriceCents: number | null): string {
  const inclusive = formatPrice(monthlyPriceCents);
  if (inclusive === "—") return inclusive;
  return `${inclusive} TTC (${formatPriceExcludingVat(monthlyPriceCents)} HT)`;
}
