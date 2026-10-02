import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { contactLabel, replyWindowClosesAt } from "./conversations";

describe("contactLabel", () => {
  it("affiche un numero WhatsApp francais comme on l'ecrit", () => {
    expect(contactLabel("WHATSAPP", "33612345678")).toBe("06 12 34 56 78");
  });

  it("garde l'indicatif d'un numero etranger", () => {
    expect(contactLabel("WHATSAPP", "447911123456")).toBe("+447911123456");
  });

  it("resume un identifiant Messenger ou Instagram a ses derniers caracteres", () => {
    expect(contactLabel("MESSENGER", "6843201958772341")).toBe("Contact ·2341");
    expect(contactLabel("INSTAGRAM", "17841400000009876")).toBe("Contact ·9876");
  });
});

describe("replyWindowClosesAt", () => {
  it("ferme la fenetre de reponse 24 h apres le dernier message du contact", () => {
    expect(replyWindowClosesAt(new Date("2026-10-01T08:30:00Z"))?.toISOString()).toBe("2026-10-02T08:30:00.000Z");
  });

  it("ne laisse pas repondre a un contact qui n'a jamais ecrit", () => {
    expect(replyWindowClosesAt(null)).toBeNull();
  });
});

