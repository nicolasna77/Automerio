import { describe, expect, it } from "vitest";
import { stripLinks } from "./sms-text";

describe("stripLinks", () => {
  it("retire les liens avec ou sans protocole", () => {
    expect(stripLinks("Fuite, voir https://evil.example/pay?x=1 vite")).toBe("Fuite, voir vite");
    expect(stripLinks("Rappel www.arnaque.com/login svp")).toBe("Rappel svp");
    expect(stripLinks("Payez sur colis-relais.fr/suivi")).toBe("Payez sur");
  });

  it("garde un texte ordinaire intact", () => {
    expect(stripLinks("Fuite sous l'évier, intervention urgente")).toBe("Fuite sous l'évier, intervention urgente");
    expect(stripLinks("J.Martin, St.Étienne")).toBe("J.Martin, St.Étienne");
  });
});
