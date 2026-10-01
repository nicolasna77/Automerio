import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./prompt";
import { toneInstructionOf, voiceSettingsOf } from "./voice";

describe("réglages de voix", () => {
  it("prend la voix et le débit choisis", () => {
    expect(voiceSettingsOf({ voice: "cedar", speakingRate: "0.9" })).toEqual({ voice: "cedar", speed: 0.9 });
  });

  it("retombe sur la voix et le débit par défaut si le réglage est absent ou inconnu", () => {
    expect(voiceSettingsOf({})).toEqual({ voice: "marin", speed: 1 });
    expect(voiceSettingsOf({ voice: "inconnue", speakingRate: "3" })).toEqual({ voice: "marin", speed: 1 });
  });

  it("traduit le ton en consigne, chaleureux par défaut", () => {
    expect(toneInstructionOf({ tone: "professional" })).toContain("professionnel");
    expect(toneInstructionOf({})).toContain("chaleureux");
  });
});

describe("consignes de l'agent vocal", () => {
  const options = { calendarConnected: false, companyName: "Plomberie Martin" };

  it("transmet les consignes de l'entreprise au standard, avec le ton choisi", () => {
    const prompt = buildSystemPrompt(
      "standard-telephonique-ia",
      { callInstructions: "Demander d'abord s'il s'agit d'une urgence.", tone: "professional" },
      options
    );
    expect(prompt).toContain("## Consignes de l'entreprise");
    expect(prompt).toContain("Demander d'abord s'il s'agit d'une urgence.");
    expect(prompt).toContain("Ton professionnel");
    expect(prompt).toContain("Tu ne prends pas de rendez-vous");
  });

  it("transmet les consignes à la prise de rendez-vous, quel que soit l'objectif", () => {
    const prompt = buildSystemPrompt(
      "prise-rdv-telephone",
      { objectives: ["appointment"], callInstructions: "Demander la prestation souhaitée." },
      options
    );
    expect(prompt).toContain("Demander la prestation souhaitée.");
  });

  it("n'ajoute pas de section vide sans consignes, et garde les règles strictes", () => {
    const prompt = buildSystemPrompt("standard-telephonique-ia", {}, options);
    expect(prompt).not.toContain("## Consignes de l'entreprise");
    expect(prompt).toContain("## Règles strictes");
    expect(prompt).not.toContain("—");
  });
});
