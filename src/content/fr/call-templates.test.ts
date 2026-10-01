import { describe, expect, it } from "vitest";
import { CALL_TEMPLATES, fillTemplate } from "./call-templates";

describe("modèles de consignes", () => {
  it("met le nom de l'entreprise, ou une formule neutre sans nom", () => {
    expect(fillTemplate("Bonjour, {entreprise}.", "Plomberie Lefèvre")).toBe("Bonjour, Plomberie Lefèvre.");
    expect(fillTemplate("Bonjour, {entreprise}.", "  ")).toBe("Bonjour, notre entreprise.");
  });

  it("n'utilise pas de tiret long, et chaque secteur a ses deux textes", () => {
    const ids = new Set<string>();
    for (const template of CALL_TEMPLATES) {
      expect(ids.has(template.id)).toBe(false);
      ids.add(template.id);
      for (const text of [template.greeting, template.instructions]) {
        expect(text.trim().length).toBeGreaterThan(20);
        expect(text).not.toContain("—");
      }
      expect(template.greeting).toContain("{entreprise}");
      expect(template.greeting).toContain("assistant virtuel");
      // L'assistant se présente déjà de lui-même : les consignes ne le répètent pas.
      expect(template.instructions).not.toContain("assistant virtuel");
      for (const heading of ["Questions à poser :", "À noter :", "À éviter :"]) {
        expect(template.instructions).toContain(heading);
      }
      // Le standard ne prend pas de rendez-vous : l'accueil ne doit pas le promettre.
      expect(template.greeting).not.toMatch(/rendez-vous|réservation/i);
    }
  });
});
