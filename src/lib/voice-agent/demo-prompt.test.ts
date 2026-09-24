import { describe, expect, it } from "vitest";
import { buildDemoPrompt } from "./demo-prompt";

describe("buildDemoPrompt", () => {
  const prompt = buildDemoPrompt(
    [
      {
        name: "Standard téléphonique automatisé",
        description: "Réception et orientation des appels.",
        price: "79 € par mois, sans frais de mise en place",
        usage: "150 minutes par mois comprises",
      },
      {
        name: "Résumé de PDF",
        description: "Synthèse de documents.",
        price: "tarif sur demande",
        usage: null,
      },
    ],
    "Standard téléphonique automatisé"
  );

  it("rappelle la demande du visiteur et la durée", () => {
    expect(prompt).toContain("depuis la page « Standard téléphonique automatisé »");
    expect(prompt).toContain("3 minutes au plus");
  });

  it("donne le catalogue réel avec ses prix et quotas", () => {
    expect(prompt).toContain(
      "- Standard téléphonique automatisé : Réception et orientation des appels. Tarif : 79 € par mois, sans frais de mise en place. 150 minutes par mois comprises."
    );
    expect(prompt).toContain("- Résumé de PDF : Synthèse de documents. Tarif : tarif sur demande.");
  });

  it("interdit d'inventer et prévoit le refus d'appel", () => {
    expect(prompt).toContain("N'annonce que les solutions, prix et fonctionnalités du catalogue");
    expect(prompt).toContain("ne pas avoir demandé cet appel");
  });
});
