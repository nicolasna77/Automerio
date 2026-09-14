import { describe, expect, it } from "vitest";
import { detectUnsupportedClaims } from "./claims";

describe("preuves inventées", () => {
  it("laisse passer un texte qui n'affirme que le catalogue", () => {
    const body =
      "Vous êtes sur un chantier, les mains occupées. Le téléphone sonne. " +
      "Automerio installe un assistant qui décroche et prend les rendez-vous. " +
      "À partir de 49 € par mois, 100 appels inclus.";
    expect(detectUnsupportedClaims(body)).toEqual([]);
  });

  it("ne s'alarme ni d'un prix ni d'un quota", () => {
    expect(detectUnsupportedClaims("79 € par mois, 150 minutes incluses, puis 0,30 € par minute."))
      .toEqual([]);
  });

  it("ne prend pas une citation rhétorique pour un témoignage", () => {
    const body = "Ensemble, elles créent une pression permanente : “il faut que je réponde vite”.";
    expect(detectUnsupportedClaims(body)).toEqual([]);
  });

  it("signale un pourcentage", () => {
    expect(detectUnsupportedClaims("Nos clients gagnent 40 % de rendez-vous en plus.")).toHaveLength(1);
  });

  it("signale un facteur de progression", () => {
    expect(detectUnsupportedClaims("Trois fois plus de demandes traitées.")[0]).toContain("facteur");
  });

  it("signale un nombre de clients", () => {
    expect(detectUnsupportedClaims("Déjà 200 artisans nous font confiance.")[0]).toContain("nombre de clients");
  });

  it("signale une citation attribuée à quelqu'un", () => {
    const body = "« Je ne rate plus un appel » — Marc, plombier à Nantes.";
    expect(detectUnsupportedClaims(body)[0]).toContain("témoignage");
  });

  it("signale une position de marché", () => {
    expect(detectUnsupportedClaims("Le n° 1 de l'automatisation pour artisans.")[0]).toContain(
      "position de marché"
    );
  });

  it("signale une certification", () => {
    expect(detectUnsupportedClaims("Une solution certifiée pour les TPE.")[0]).toContain("certification");
  });

  it("cumule les alertes d'un même texte", () => {
    expect(
      detectUnsupportedClaims("Leader français, +30 % de résultats, 500 entreprises équipées.")
    ).toHaveLength(3);
  });
});
