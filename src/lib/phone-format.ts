// Affichage d'un numéro E.164 français (+33612345678) au format usuel
// « 06 12 34 56 78 ». Les autres numéros sont rendus tels quels.
export function formatFrenchPhone(e164: string): string {
  if (!/^\+33\d{9}$/.test(e164)) return e164;
  return `0${e164.slice(3)}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}
