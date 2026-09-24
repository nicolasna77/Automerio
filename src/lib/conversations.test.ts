import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { contactLabel } from "./conversations";

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
