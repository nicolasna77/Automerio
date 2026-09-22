import { describe, expect, it } from "vitest";
import { canReadClientService } from "./client-service-access";

const prestation = { userId: "u1", organizationId: "org1" };

describe("canReadClientService", () => {
  it("laisse passer le proprietaire, membre de l'organisation porteuse", () => {
    expect(
      canReadClientService(prestation, { userId: "u1", organizationIds: ["org1"] })
    ).toBe(true);
  });

  it("refuse un autre utilisateur, meme membre de la meme organisation", () => {
    expect(
      canReadClientService(prestation, { userId: "u2", organizationIds: ["org1"] })
    ).toBe(false);
  });

  it("refuse le proprietaire retire de l'organisation porteuse", () => {
    // Le cas que la seule verification de `userId` laissait passer : la ligne
    // porte encore son identifiant, mais il n'est plus membre.
    expect(
      canReadClientService(prestation, { userId: "u1", organizationIds: [] })
    ).toBe(false);
  });

  it("refuse le proprietaire devenu membre d'une autre organisation seulement", () => {
    expect(
      canReadClientService(prestation, { userId: "u1", organizationIds: ["org2"] })
    ).toBe(false);
  });

  it("laisse passer quand l'utilisateur appartient a plusieurs organisations", () => {
    expect(
      canReadClientService(prestation, {
        userId: "u1",
        organizationIds: ["org2", "org1", "org3"],
      })
    ).toBe(true);
  });
});
