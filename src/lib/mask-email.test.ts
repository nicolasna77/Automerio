import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("ne garde que la première lettre de la partie locale et le domaine", () => {
    expect(maskEmail("jean.dupont@exemple.fr")).toBe("j***@exemple.fr");
  });

  it("masque aussi une partie locale d'un seul caractère", () => {
    expect(maskEmail("j@exemple.fr")).toBe("j***@exemple.fr");
  });

  it("ignore les espaces autour de l'adresse", () => {
    expect(maskEmail("  marie@exemple.fr ")).toBe("m***@exemple.fr");
  });

  it("ne coupe pas un caractère hors du plan de base", () => {
    expect(maskEmail("😀x@exemple.fr")).toBe("😀***@exemple.fr");
  });

  it("ne révèle rien d'une valeur qui n'est pas une adresse", () => {
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("sans-arobase")).toBe("***");
    expect(maskEmail("@exemple.fr")).toBe("***");
    expect(maskEmail("jean@")).toBe("***");
  });
});
