export type CatalogItem = {
  id: string;
  name: string;
  note: string;
  details: string;
  priceCents: number | null;
};

export type CatalogSection = {
  id: string;
  title: string;
  items: CatalogItem[];
};

export const CATALOG_LIMITS = {
  sections: 60,
  items: 500,
  title: 80,
  name: 120,
  note: 60,
  details: 400,
  priceCents: 100_000_00,
} as const;

export function newCatalogId(): string {
  return crypto.randomUUID();
}

export function emptyCatalogItem(): CatalogItem {
  return { id: newCatalogId(), name: "", note: "", details: "", priceCents: null };
}

export function emptyCatalogSection(): CatalogSection {
  return { id: newCatalogId(), title: "", items: [emptyCatalogItem()] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isProductCatalog(value: unknown): value is CatalogSection[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((section) => isRecord(section) && Array.isArray(section.items))
  );
}

export function hasUppercaseOnly(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  return letters.length > 1 && letters === letters.toLocaleUpperCase("fr-FR");
}

export function softenCapitals(text: string): string {
  if (!hasUppercaseOnly(text)) return text;
  const lower = text.toLocaleLowerCase("fr-FR");
  return lower.replace(/\p{L}/u, (first) => first.toLocaleUpperCase("fr-FR"));
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value);
  return cents >= 0 && cents <= CATALOG_LIMITS.priceCents ? cents : null;
}

export function sanitizeProductCatalog(value: unknown): CatalogSection[] {
  if (!Array.isArray(value)) return [];
  let itemBudget: number = CATALOG_LIMITS.items;
  const sections: CatalogSection[] = [];

  for (const rawSection of value.slice(0, CATALOG_LIMITS.sections)) {
    if (!isRecord(rawSection) || !Array.isArray(rawSection.items)) continue;
    const items: CatalogItem[] = [];
    for (const rawItem of rawSection.items) {
      if (itemBudget === 0) break;
      if (!isRecord(rawItem)) continue;
      const name = cleanText(rawItem.name, CATALOG_LIMITS.name);
      if (!name) continue;
      items.push({
        id: cleanText(rawItem.id, 64) || newCatalogId(),
        name,
        note: cleanText(rawItem.note, CATALOG_LIMITS.note),
        details: cleanText(rawItem.details, CATALOG_LIMITS.details),
        priceCents: cleanPrice(rawItem.priceCents),
      });
      itemBudget--;
    }
    if (items.length === 0) continue;
    sections.push({
      id: cleanText(rawSection.id, 64) || newCatalogId(),
      title: cleanText(rawSection.title, CATALOG_LIMITS.title),
      items,
    });
  }
  return sections;
}

export function parsePriceInput(input: string): number | null {
  const normalized = input.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function formatPriceInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

const LEGACY_ITEM = /^(.+?)(?:\s*\((.*)\))?\s+[—–-]\s+(.+?)\s*$/;

function parseLegacyLine(line: string): CatalogItem | null {
  const match = LEGACY_ITEM.exec(line);
  const priceCents = match ? parsePriceInput(match[3]) : null;
  if (!match || priceCents === null) return null;
  return {
    id: newCatalogId(),
    name: softenCapitals(match[1].trim()),
    note: "",
    details: softenCapitals(match[2]?.trim() ?? ""),
    priceCents,
  };
}

export function parseLegacyCatalog(text: string): CatalogSection[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sections: CatalogSection[] = [];
  let current: CatalogSection | null = null;

  lines.forEach((line, index) => {
    const item = parseLegacyLine(line);
    const nextIsPricedItem = index + 1 < lines.length && parseLegacyLine(lines[index + 1]) !== null;
    const isTitle = !item && (/[:：]$/.test(line) || nextIsPricedItem);

    if (isTitle) {
      current = { id: newCatalogId(), title: softenCapitals(line.replace(/\s*[:：]$/, "")), items: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { id: newCatalogId(), title: "", items: [] };
      sections.push(current);
    }
    current.items.push(
      item ?? { id: newCatalogId(), name: softenCapitals(line), note: "", details: "", priceCents: null }
    );
  });

  return sanitizeProductCatalog(sections);
}

export function readProductCatalog(value: unknown): CatalogSection[] {
  if (typeof value === "string") return parseLegacyCatalog(value);
  return sanitizeProductCatalog(value);
}

export function countCatalogItems(sections: CatalogSection[]): number {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

export function describeProductCatalog(sections: CatalogSection[]): string {
  const items = countCatalogItems(sections);
  if (items === 0) return "Aucun produit";
  const products = `${items} produit${items > 1 ? "s" : ""}`;
  const titled = sections.filter((section) => section.title).length;
  return titled > 1 ? `${products} dans ${titled} rubriques` : products;
}

export function formatCatalogForAgent(sections: CatalogSection[]): string {
  return sections
    .map((section) => {
      const lines = section.items.map((item) => {
        const note = item.note ? ` (${item.note})` : "";
        const price = item.priceCents !== null ? ` — ${formatPriceInput(item.priceCents)} €` : " — prix non précisé";
        const details = item.details ? ` : ${item.details}` : "";
        return `- ${item.name}${note}${price}${details}`;
      });
      return (section.title ? [section.title, ...lines] : lines).join("\n");
    })
    .join("\n\n");
}
