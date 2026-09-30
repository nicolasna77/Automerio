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
      expect(template.instructions).toMatch(/^Au début de l'appel, présenter \{entreprise\}/);
    }
  });
});
