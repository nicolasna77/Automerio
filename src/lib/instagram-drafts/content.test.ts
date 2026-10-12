import { describe, expect, it } from "vitest";
import {
  canDraftInstagram,
  cleanHashtag,
  cleanHashtags,
  draftToText,
  unsupportedNumbers,
  type DraftContent,
} from "./content";

const labels = {
  slide: (n: number) => `Diapositive ${n}`,
  stories: "Stories :",
  day: (d: { day: string; time: string; angle: string }) => `${d.day} ${d.time} ${d.angle}`,
};

describe("canDraftInstagram", () => {
  it("ouvre les brouillons à une solution Instagram payée", () => {
    expect(canDraftInstagram({ status: "ACTIVE", service: { slug: "assistant-instagram" } })).toBe(true);
    expect(canDraftInstagram({ status: "CONFIGURING", service: { slug: "assistant-instagram" } })).toBe(true);
  });

  it("les refuse avant le paiement, après la résiliation et hors Instagram", () => {
    expect(canDraftInstagram({ status: "PENDING_PAYMENT", service: { slug: "assistant-instagram" } })).toBe(false);
    expect(canDraftInstagram({ status: "CANCELED", service: { slug: "assistant-instagram" } })).toBe(false);
    expect(canDraftInstagram({ status: "ACTIVE", service: { slug: "assistant-whatsapp" } })).toBe(false);
  });
});

describe("cleanHashtags", () => {
  it("garde un seul mot en minuscules, précédé de #", () => {
    expect(cleanHashtag("##Plombier Lyon!")).toBe("#plombierlyon");
    expect(cleanHashtag("pâtisserie")).toBe("#pâtisserie");
    expect(cleanHashtag(" # ")).toBeNull();
  });

  it("retire les doublons et s'arrête à 5", () => {
    expect(cleanHashtags(["#a", "A", "b", "c", "d", "e", "f"])).toEqual(["#a", "#b", "#c", "#d", "#e"]);
  });
});

describe("unsupportedNumbers", () => {
  const caption = (body: string): DraftContent => ({
    kind: "CAPTION",
    content: { hook: "Une fuite sous l'évier ?", body, cta: "Enregistrez ce conseil.", hashtags: [] },
  });

  it("signale un chiffre absent de ce que le client a écrit", () => {
    expect(unsupportedNumbers(caption("Nous avons réparé 250 fuites en 2025."), ["fuites"])).toEqual(["250", "2025"]);
  });

  it("accepte les chiffres donnés par le client, virgule ou point", () => {
    expect(unsupportedNumbers(caption("Le déplacement coûte 49,90 €."), ["déplacement à 49.90 €"])).toEqual([]);
  });

  it("ne signale pas les petits entiers qui structurent le texte", () => {
    expect(unsupportedNumbers(caption("3 gestes simples, et le 5e change tout."), [])).toEqual([]);
  });

  it("ignore l'heure de publication d'un planning", () => {
    const plan: DraftContent = {
      kind: "WEEKLY_PLAN",
      content: {
        days: [{ day: "Lundi", format: "reel", angle: "Un chantier", hook: "Avant, après", goal: "saves", time: "12:30" }],
        stories: "Deux par jour.",
      },
    };
    expect(unsupportedNumbers(plan, [])).toEqual([]);
  });
});

describe("draftToText", () => {
  it("assemble une légende prête à coller", () => {
    const text = draftToText(
      { kind: "CAPTION", content: { hook: "Accroche", body: "Corps", cta: "Invitation", hashtags: ["#a", "#b"] } },
      labels
    );
    expect(text).toBe("Accroche\n\nCorps\n\nInvitation\n\n#a #b");
  });

  it("numérote les diapositives d'un carrousel", () => {
    const text = draftToText(
      {
        kind: "CAROUSEL",
        content: { slides: [{ title: "Titre", text: "Texte" }], caption: "Légende", hashtags: [] },
      },
      labels
    );
    expect(text).toBe("Diapositive 1\nTitre\nTexte\n\nLégende");
  });

  it("ne copie que les hashtags", () => {
    const text = draftToText(
      { kind: "HASHTAGS", content: { tags: [{ tag: "#a", tier: "niche", why: "x" }, { tag: "#b", tier: "mid", why: "y" }] } },
      labels
    );
    expect(text).toBe("#a #b");
  });
});
