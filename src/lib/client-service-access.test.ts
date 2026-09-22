import { describe, expect, it } from "vitest";
import {
  canManageClientServiceBilling,
  canReadClientService,
  hasBillingRole,
} from "./client-service-access";

const prestation = { organizationId: "org1" };

const membre = { memberships: [{ organizationId: "org1", role: "member" }] };
const admin = { memberships: [{ organizationId: "org1", role: "admin" }] };
const proprietaire = { memberships: [{ organizationId: "org1", role: "owner" }] };
const etranger = { memberships: [{ organizationId: "org2", role: "owner" }] };
const parti = { memberships: [] };

describe("hasBillingRole", () => {
  it("reconnaît les deux rôles qui engagent", () => {
    expect(hasBillingRole("owner")).toBe(true);
    expect(hasBillingRole("admin")).toBe(true);
  });

  it("refuse le membre simple", () => {
    expect(hasBillingRole("member")).toBe(false);
  });

  it("lit les rôles multiples, que better-auth sépare par des virgules", () => {
    // Comparer la chaîne entière manquerait ce cas.
    expect(hasBillingRole("admin,member")).toBe(true);
    expect(hasBillingRole("member,owner")).toBe(true);
    expect(hasBillingRole("member, admin")).toBe(true);
    expect(hasBillingRole("member,guest")).toBe(false);
  });

  it("ne se laisse pas prendre par un rôle qui contient le mot", () => {
    expect(hasBillingRole("coowner")).toBe(false);
    expect(hasBillingRole("administrateur")).toBe(false);
  });
});

describe("canReadClientService", () => {
  it("ouvre la consultation à tout membre, quel que soit son rôle", () => {
    expect(canReadClientService(prestation, membre)).toBe(true);
    expect(canReadClientService(prestation, admin)).toBe(true);
    expect(canReadClientService(prestation, proprietaire)).toBe(true);
  });

  it("refuse un membre d'une autre organisation", () => {
    expect(canReadClientService(prestation, etranger)).toBe(false);
  });

  it("refuse celui qui a quitté l'organisation", () => {
    // Le cas que la seule vérification de `userId` laissait passer : la ligne
    // porte encore son identifiant, mais il n'est plus membre.
    expect(canReadClientService(prestation, parti)).toBe(false);
  });

  it("laisse passer quand l'utilisateur appartient à plusieurs organisations", () => {
    expect(
      canReadClientService(prestation, {
        memberships: [
          { organizationId: "org2", role: "owner" },
          { organizationId: "org1", role: "member" },
        ],
      })
    ).toBe(true);
  });
});

describe("canManageClientServiceBilling", () => {
  it("réserve les gestes qui engagent aux rôles owner et admin", () => {
    expect(canManageClientServiceBilling(prestation, proprietaire)).toBe(true);
    expect(canManageClientServiceBilling(prestation, admin)).toBe(true);
    expect(canManageClientServiceBilling(prestation, membre)).toBe(false);
  });

  it("exige le rôle dans l'organisation porteuse, pas dans une autre", () => {
    // Être propriétaire ailleurs ne donne aucun droit ici.
    expect(
      canManageClientServiceBilling(prestation, {
        memberships: [
          { organizationId: "org2", role: "owner" },
          { organizationId: "org1", role: "member" },
        ],
      })
    ).toBe(false);
  });

  it("refuse celui qui a quitté l'organisation", () => {
    expect(canManageClientServiceBilling(prestation, parti)).toBe(false);
  });

  it("n'accorde jamais plus que la consultation", () => {
    // Invariant : tout ce qui engage suppose de pouvoir consulter.
    for (const viewer of [membre, admin, proprietaire, etranger, parti]) {
      if (canManageClientServiceBilling(prestation, viewer)) {
        expect(canReadClientService(prestation, viewer)).toBe(true);
      }
    }
  });
});
