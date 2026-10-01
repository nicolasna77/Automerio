import { describe, expect, it } from "vitest";
import { CALL_TEMPLATES } from "@/content/fr/call-templates";
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
    expect(prompt).toContain("## Limites et règles strictes");
    expect(prompt).not.toContain("—");
  });

  it("place les limites après les consignes de l'entreprise, pour qu'elles priment", () => {
    // Le modèle Restauration parle de réservations : sur le standard, qui ne
    // réserve rien, l'interdiction doit venir après lui.
    const restaurant = CALL_TEMPLATES.find((template) => template.id === "restauration")!;
    const prompt = buildSystemPrompt("standard-telephonique-ia", { callInstructions: restaurant.instructions }, options);
    const instructionsAt = prompt.indexOf("## Consignes de l'entreprise");
    const limitsAt = prompt.indexOf("## Limites et règles strictes");
    expect(instructionsAt).toBeGreaterThan(-1);
    expect(limitsAt).toBeGreaterThan(instructionsAt);
    expect(prompt.slice(limitsAt)).toContain("Tu ne prends pas de rendez-vous, ni de réservation");
  });

  it("interdit de confirmer un rendez-vous sans agenda connecté, après les consignes", () => {
    const prompt = buildSystemPrompt(
      "prise-rdv-telephone",
      { objectives: ["appointment"], callInstructions: "Toujours confirmer le créneau demandé." },
      options
    );
    const limits = prompt.slice(prompt.indexOf("## Limites et règles strictes"));
    expect(limits).toContain("Aucun agenda n'est connecté");
    expect(limits).toContain("Tu ne prends pas de commande");
  });
});
