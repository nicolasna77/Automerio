import { describe, expect, it } from "vitest";
import {
  canChangeRole,
  canInvite,
  canRemoveMember,
  isInvitableRole,
  isOrganizationManager,
  roleLabel,
  type TeamMember,
} from "./organization-roles";

const proprietaire: TeamMember = { userId: "u-owner", role: "owner" };
const responsable: TeamMember = { userId: "u-admin", role: "admin" };
const collaborateur: TeamMember = { userId: "u-member", role: "member" };
const secondProprietaire: TeamMember = { userId: "u-owner-2", role: "owner" };

const equipe = [proprietaire, responsable, collaborateur];
const equipeADeuxProprietaires = [...equipe, secondProprietaire];

describe("roleLabel", () => {
  it("traduit les trois rôles", () => {
    expect(roleLabel("owner")).toBe("Propriétaire");
    expect(roleLabel("admin")).toBe("Responsable");
    expect(roleLabel("member")).toBe("Collaborateur");
  });

  it("laisse passer un rôle inconnu plutôt que d'afficher du vide", () => {
    expect(roleLabel("comptable")).toBe("comptable");
  });
});

describe("isOrganizationManager", () => {
  it("reconnaît le propriétaire et le responsable", () => {
    expect(isOrganizationManager("owner")).toBe(true);
    expect(isOrganizationManager("admin")).toBe(true);
    expect(isOrganizationManager("member")).toBe(false);
  });

  it("lit les rôles multiples, séparés par des virgules", () => {
    expect(isOrganizationManager("member,admin")).toBe(true);
    expect(isOrganizationManager("member, owner")).toBe(true);
    expect(isOrganizationManager("member,guest")).toBe(false);
  });

  it("ne se laisse pas prendre par un rôle qui contient le mot", () => {
    expect(isOrganizationManager("coowner")).toBe(false);
    expect(isOrganizationManager("administrateur")).toBe(false);
  });
});

describe("isInvitableRole", () => {
  it("n'accepte que les deux rôles proposés dans l'interface", () => {
    expect(isInvitableRole("admin")).toBe(true);
    expect(isInvitableRole("member")).toBe(true);
    expect(isInvitableRole("owner")).toBe(false);
    expect(isInvitableRole("n'importe quoi")).toBe(false);
  });
});

describe("canInvite", () => {
  it("ouvre l'invitation au propriétaire et au responsable", () => {
    expect(canInvite(proprietaire).ok).toBe(true);
    expect(canInvite(responsable).ok).toBe(true);
  });

  it("la refuse au collaborateur, en le disant", () => {
    const verdict = canInvite(collaborateur);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain("responsables");
  });
});

describe("canRemoveMember", () => {
  it("laisse un responsable retirer un collaborateur", () => {
    expect(canRemoveMember(responsable, collaborateur, equipe).ok).toBe(true);
  });

  it("refuse à un collaborateur de retirer qui que ce soit", () => {
    expect(canRemoveMember(collaborateur, responsable, equipe).ok).toBe(false);
  });

  it("empêche un responsable de retirer le propriétaire", () => {
    const verdict = canRemoveMember(responsable, proprietaire, equipe);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain("propriétaire");
  });

  it("empêche de retirer le dernier propriétaire, même par lui-même", () => {
    const verdict = canRemoveMember(proprietaire, proprietaire, equipe);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain("garder un propriétaire");
  });

  it("autorise le retrait d'un propriétaire quand il en reste un autre", () => {
    expect(
      canRemoveMember(proprietaire, secondProprietaire, equipeADeuxProprietaires).ok
    ).toBe(true);
  });
});

describe("canChangeRole", () => {
  it("laisse un responsable promouvoir un collaborateur", () => {
    expect(canChangeRole(responsable, collaborateur, "admin", equipe).ok).toBe(true);
  });

  it("refuse d'attribuer le rôle de propriétaire depuis l'interface", () => {
    const verdict = canChangeRole(proprietaire, collaborateur, "owner", equipe);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain("ne peut pas être attribué");
  });

  it("refuse un rôle inventé", () => {
    expect(canChangeRole(proprietaire, collaborateur, "patron", equipe).ok).toBe(false);
  });

  it("empêche de rétrograder le dernier propriétaire", () => {
    // Sans cette règle, l'organisation se retrouverait sans personne
    // pour payer ni résilier.
    const verdict = canChangeRole(proprietaire, proprietaire, "member", equipe);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain("garder un propriétaire");
  });

  it("autorise la rétrogradation quand un autre propriétaire reste", () => {
    expect(
      canChangeRole(proprietaire, secondProprietaire, "admin", equipeADeuxProprietaires).ok
    ).toBe(true);
  });

  it("empêche un responsable de toucher au rôle d'un propriétaire", () => {
    expect(
      canChangeRole(responsable, secondProprietaire, "member", equipeADeuxProprietaires).ok
    ).toBe(false);
  });
});
