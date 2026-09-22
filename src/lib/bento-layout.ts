export type BentoSize = "featured" | "wide" | "small";

const COLUMNS = 4;

const CELLS: Record<BentoSize, number> = {
  featured: 4,
  wide: 2,
  small: 1,
};

/**
 * Repartit n tuiles sur une grille de quatre colonnes sans laisser de trou :
 * la premiere passe en vedette quand il y a de quoi l'entourer, et les
 * dernieres s'elargissent juste ce qu'il faut pour completer la derniere
 * ligne. Le catalogue etant administrable, la mise en page se deduit du
 * nombre de solutions — aucun slug n'y est ecrit.
 *
 * Les tuiles larges sont placees en fin de liste : le placement automatique
 * de CSS Grid ne saute alors jamais une cellule faute de place sur la ligne.
 */
export function bentoLayout(count: number): BentoSize[] {
  if (count <= 0) return [];

  const sizes: BentoSize[] = Array.from({ length: count }, (_, index) =>
    index === 0 && count >= 5 ? "featured" : "small"
  );

  const used = sizes.reduce((total, size) => total + CELLS[size], 0);
  const missing = (COLUMNS - (used % COLUMNS)) % COLUMNS;

  for (let promoted = 0; promoted < missing; promoted += 1) {
    const target = count - 1 - promoted;
    if (target < 0 || sizes[target] !== "small") break;
    sizes[target] = "wide";
  }

  return sizes;
}
