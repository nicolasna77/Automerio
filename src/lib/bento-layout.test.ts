import { describe, expect, it } from "vitest";
import { bentoLayout, type BentoSize } from "./bento-layout";

const CELLS: Record<BentoSize, number> = { featured: 4, wide: 2, small: 1 };

function cells(sizes: BentoSize[]): number {
  return sizes.reduce((total, size) => total + CELLS[size], 0);
}

describe("bentoLayout", () => {
  it("met en vedette la première solution dès qu'il y en a assez", () => {
    expect(bentoLayout(7)[0]).toBe("featured");
    expect(bentoLayout(5)[0]).toBe("featured");
  });

  it("n'en met pas en vedette sur un petit groupe", () => {
    expect(bentoLayout(3)).not.toContain("featured");
    expect(bentoLayout(4)).not.toContain("featured");
  });

  it("remplit les lignes de quatre colonnes sans trou", () => {
    for (let count = 3; count <= 24; count += 1) {
      expect(cells(bentoLayout(count)) % 4, `${count} solutions`).toBe(0);
    }
  });

  it("dispose les sept solutions de communication en trois lignes", () => {
    expect(bentoLayout(7)).toEqual([
      "featured",
      "small",
      "small",
      "small",
      "small",
      "wide",
      "wide",
    ]);
  });

  it("élargit la dernière des trois solutions d'information", () => {
    expect(bentoLayout(3)).toEqual(["small", "small", "wide"]);
  });

  it("garde une tuile par solution", () => {
    for (let count = 0; count <= 12; count += 1) {
      expect(bentoLayout(count)).toHaveLength(count);
    }
  });

  it("ne renvoie rien pour un groupe vide", () => {
    expect(bentoLayout(0)).toEqual([]);
  });
});
