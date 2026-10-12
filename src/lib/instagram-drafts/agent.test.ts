import { describe, expect, it } from "vitest";
import { buildDraftPrompt, buildUserMessage, normalizeDraft, type DraftBrief } from "./agent";

const brief: DraftBrief = {
  kind: "CAPTION",
  subject: "Rénovation d'une salle de bains",
  goal: "saves",
  details: "Chantier terminé en mars, douche à l'italienne.",
  business: { name: "Plomberie Lefèvre", instagramUsername: "@plomberielefevre", faq: null },
};

describe("buildDraftPrompt", () => {
  it("interdit d'inventer un fait et présente l'entreprise", () => {
    const prompt = buildDraftPrompt(brief);
    expect(prompt).toContain("Interdiction absolue d'inventer un fait");
    expect(prompt).toContain("Plomberie Lefèvre");
    expect(prompt).toContain("125 caractères");
  });

  it("donne les consignes propres à chaque type", () => {
    expect(buildDraftPrompt({ ...brief, kind: "CAROUSEL" })).toContain("de 4 à 10 diapositives");
    expect(buildDraftPrompt({ ...brief, kind: "HASHTAGS" })).toContain("de 3 à 5");
    expect(buildDraftPrompt({ ...brief, kind: "WEEKLY_PLAN" })).toContain("du lundi au dimanche");
  });
});

describe("buildUserMessage", () => {
  it("reprend le sujet, l'objectif et les précisions", () => {
    const message = buildUserMessage(brief);
    expect(message).toContain("Sujet : Rénovation d'une salle de bains");
    expect(message).toContain("être enregistrée");
    expect(message).toContain("douche à l'italienne");
  });

  it("omet l'objectif et les précisions absents", () => {
    expect(buildUserMessage({ ...brief, goal: null, details: null })).toBe("Sujet : Rénovation d'une salle de bains");
  });
});

describe("normalizeDraft", () => {
  it("borne un carrousel à 10 diapositives et nettoie ses hashtags", () => {
    const slides = Array.from({ length: 12 }, (_, i) => ({ title: `T${i}`, text: "x" }));
    const draft = normalizeDraft("CAROUSEL", { slides, caption: "c", hashtags: ["Plombier", "#plombier", "lyon"] });
    if (draft.kind !== "CAROUSEL") throw new Error("type inattendu");
    expect(draft.content.slides).toHaveLength(10);
    expect(draft.content.hashtags).toEqual(["#plombier", "#lyon"]);
  });

  it("dédoublonne les hashtags proposés et en garde 5", () => {
    const tags = ["a", "A", "b", "c", "d", "e", "f"].map((tag) => ({ tag, tier: "niche", why: "w" }));
    const draft = normalizeDraft("HASHTAGS", { tags });
    if (draft.kind !== "HASHTAGS") throw new Error("type inattendu");
    expect(draft.content.tags.map((t) => t.tag)).toEqual(["#a", "#b", "#c", "#d", "#e"]);
  });

  it("garde 7 jours au plus", () => {
    const days = Array.from({ length: 9 }, () => ({
      day: "Lundi",
      format: "reel",
      angle: "a",
      hook: "h",
      goal: "saves",
      time: "12:00",
    }));
    const draft = normalizeDraft("WEEKLY_PLAN", { days, stories: "s" });
    if (draft.kind !== "WEEKLY_PLAN") throw new Error("type inattendu");
    expect(draft.content.days).toHaveLength(7);
  });
});
