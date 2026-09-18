import { describe, expect, it } from "vitest";
import {
  CATALOG_LIMITS,
  describeProductCatalog,
  formatCatalogForAgent,
  formatPriceInput,
  isProductCatalog,
  parseLegacyCatalog,
  parsePriceInput,
  readProductCatalog,
  sanitizeProductCatalog,
  softenCapitals,
  type CatalogSection,
} from "./product-catalog";

const withoutIds = (sections: CatalogSection[]) =>
  sections.map(({ title, items }) => ({
    title,
    items: items.map(({ name, note, details, priceCents }) => ({ name, note, details, priceCents })),
  }));

describe("softenCapitals", () => {
  it("remet en casse normale un texte entièrement en majuscules", () => {
    expect(softenCapitals("PROSCIUTTO E FUNGHI")).toBe("Prosciutto e funghi");
    expect(softenCapitals("4 STAGIONI")).toBe("4 Stagioni");
  });

  it("laisse intact un texte qui a déjà des minuscules ou trop peu de lettres", () => {
    expect(softenCapitals("Pizza Reine")).toBe("Pizza Reine");
    expect(softenCapitals("jambon OU thon")).toBe("jambon OU thon");
    expect(softenCapitals("XL")).toBe("Xl");
    expect(softenCapitals("A")).toBe("A");
  });
});

describe("prix", () => {
  it("lit un prix saisi à la française ou à l'anglaise", () => {
    expect(parsePriceInput("9,90")).toBe(990);
    expect(parsePriceInput("12.5 €")).toBe(1250);
    expect(parsePriceInput("19")).toBe(1900);
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("gratuit")).toBeNull();
    expect(parsePriceInput("9,999")).toBeNull();
  });

  it("réaffiche toujours un prix avec ses centimes, pour aligner la carte", () => {
    expect(formatPriceInput(990)).toBe("9,90");
    expect(formatPriceInput(1900)).toBe("19,00");
    expect(formatPriceInput(null)).toBe("");
  });
});

describe("sanitizeProductCatalog", () => {
  it("nettoie les textes, écarte les produits sans nom et les rubriques vides", () => {
    const result = sanitizeProductCatalog([
      {
        id: "s1",
        title: "  Pizzas ",
        items: [
          { id: "i1", name: " Margherita\n", note: "", details: "tomate,   mozzarella", priceCents: 990 },
          { id: "i2", name: "   ", note: "", details: "", priceCents: 100 },
          { id: "i3", name: "Reine", note: "", details: "", priceCents: -5 },
        ],
      },
      { id: "s2", title: "Vide", items: [] },
      "n'importe quoi",
    ]);
    expect(result).toEqual([
      {
        id: "s1",
        title: "Pizzas",
        items: [
          { id: "i1", name: "Margherita", note: "", details: "tomate, mozzarella", priceCents: 990 },
          { id: "i3", name: "Reine", note: "", details: "", priceCents: null },
        ],
      },
    ]);
  });

  it("borne le nombre de produits et la longueur des textes", () => {
    const items = Array.from({ length: CATALOG_LIMITS.items + 20 }, (_, i) => ({
      name: `Produit ${i} ${"x".repeat(300)}`,
      priceCents: 100,
    }));
    const result = sanitizeProductCatalog([{ title: "Tout", items }]);
    expect(result[0].items).toHaveLength(CATALOG_LIMITS.items);
    expect(result[0].items[0].name).toHaveLength(CATALOG_LIMITS.name);
    expect(result[0].items[0].id).toBeTruthy();
  });
});

describe("parseLegacyCatalog", () => {
  it("reprend une carte saisie en texte avec rubriques, compositions et prix", () => {
    const text = [
      "BASE TOMATE",
      "MARGHERITA (tomate, mozzarella, origan) — 9,90 €",
      "CALABRESE (tomate, nduja, origan (très piquante)) — 15,00 €",
      "",
      "Desserts :",
      "Tiramisu - 5,50 €",
    ].join("\n");
    expect(withoutIds(parseLegacyCatalog(text))).toEqual([
      {
        title: "Base tomate",
        items: [
          { name: "Margherita", note: "", details: "tomate, mozzarella, origan", priceCents: 990 },
          { name: "Calabrese", note: "", details: "tomate, nduja, origan (très piquante)", priceCents: 1500 },
        ],
      },
      { title: "Desserts", items: [{ name: "Tiramisu", note: "", details: "", priceCents: 550 }] },
    ]);
  });

  it("ne perd pas une liste de produits sans prix", () => {
    expect(withoutIds(parseLegacyCatalog("Croissant\nPain au chocolat"))).toEqual([
      {
        title: "",
        items: [
          { name: "Croissant", note: "", details: "", priceCents: null },
          { name: "Pain au chocolat", note: "", details: "", priceCents: null },
        ],
      },
    ]);
  });
});

describe("lecture et restitution", () => {
  const catalog: CatalogSection[] = [
    {
      id: "s1",
      title: "Pizzas",
      items: [
        { id: "a", name: "Margherita", note: "", details: "tomate, mozzarella", priceCents: 990 },
        { id: "b", name: "Calabrese", note: "très piquante", details: "", priceCents: null },
      ],
    },
    { id: "s2", title: "Desserts", items: [{ id: "c", name: "Tiramisu", note: "", details: "", priceCents: 550 }] },
  ];

  it("distingue une carte structurée des autres valeurs de configuration", () => {
    expect(isProductCatalog(catalog)).toBe(true);
    expect(isProductCatalog(["appointment"])).toBe(false);
    expect(isProductCatalog([{ trigger: "Urgence", target: "06" }])).toBe(false);
    expect(readProductCatalog("Tiramisu — 5 €")[0].items[0].priceCents).toBe(500);
    expect(readProductCatalog(undefined)).toEqual([]);
  });

  it("résume la carte et l'écrit pour l'agent vocal", () => {
    expect(describeProductCatalog(catalog)).toBe("3 produits dans 2 rubriques");
    expect(describeProductCatalog([])).toBe("Aucun produit");
    expect(formatCatalogForAgent(catalog)).toBe(
      "Pizzas\n- Margherita — 9,90 € : tomate, mozzarella\n- Calabrese (très piquante) — prix non précisé\n\nDesserts\n- Tiramisu — 5,50 €"
    );
  });
});
