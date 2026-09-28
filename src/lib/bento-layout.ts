export type BentoSize = "featured" | "wide" | "small";

const COLUMNS = 4;

const CELLS: Record<BentoSize, number> = {
  featured: 4,
  wide: 2,
  small: 1,
};

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
