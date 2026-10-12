import { describe, expect, it } from "vitest";
import { buildBridgeTwiml, CALLBACK_TIME_LIMIT_SEC } from "./callback-bridge";

describe("buildBridgeTwiml", () => {
  it("annonce, puis compose l'appelant avec le numéro de la solution", () => {
    const twiml = buildBridgeTwiml({
      announce: "Rappel d'un appelant de Plomberie & Fils.",
      customerNumber: "+33612345678",
      callerId: "+33199001234",
    });
    expect(twiml).toContain('<Say language="fr-FR">Rappel d\'un appelant de Plomberie &amp; Fils.</Say>');
    expect(twiml).toContain(`<Dial callerId="+33199001234" timeLimit="${CALLBACK_TIME_LIMIT_SEC}">`);
    expect(twiml).toContain("<Number>+33612345678</Number>");
  });

  it("échappe une valeur qui tenterait de fermer l'attribut", () => {
    const twiml = buildBridgeTwiml({ announce: "x", customerNumber: "+33612345678", callerId: '"><Hangup/>' });
    expect(twiml).not.toContain("<Hangup/>");
  });
});
