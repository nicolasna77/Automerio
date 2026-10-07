import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/stripe", () => ({ stripeClient: {} }));
vi.mock("@/lib/twilio", () => ({ releasePhoneNumber: vi.fn() }));

import {
  chooseSuccessor,
  decideOrganizationDeletion,
  type OrganizationMemberSnapshot,
} from "./account-deletion";

const day = (n: number) => new Date(2026, 0, n);
const member = (userId: string, role: string, joined: number): OrganizationMemberSnapshot => ({
  userId,
  role,
  createdAt: day(joined),
});

describe("chooseSuccessor", () => {
  it("préfère un propriétaire, même arrivé après un responsable", () => {
    const team = [member("partant", "member", 1), member("resp", "admin", 2), member("proprio", "owner", 3)];
    expect(chooseSuccessor("partant", team)?.userId).toBe("proprio");
  });

  it("à défaut de propriétaire, choisit un responsable", () => {
    const team = [member("partant", "owner", 1), member("collab", "member", 2), member("resp", "admin", 3)];
    expect(chooseSuccessor("partant", team)?.userId).toBe("resp");
  });

  it("sinon, choisit le membre le plus ancien", () => {
    const team = [member("partant", "member", 1), member("recent", "member", 9), member("ancien", "member", 4)];
    expect(chooseSuccessor("partant", team)?.userId).toBe("ancien");
  });

  it("reconnaît un rôle multiple", () => {
    const team = [member("partant", "member", 1), member("collab", "member", 2), member("multi", "member,owner", 5)];
    expect(chooseSuccessor("partant", team)?.userId).toBe("multi");
  });

  it("ne renvoie personne quand le compte est seul", () => {
    expect(chooseSuccessor("partant", [member("partant", "owner", 1)])).toBeNull();
  });
});

describe("decideOrganizationDeletion", () => {
  it("résilie et libère quand le compte est le seul membre", () => {
    expect(
      decideOrganizationDeletion("partant", { organizationId: "o", members: [member("partant", "owner", 1)] })
    ).toEqual({ organizationId: "o", action: "release" });
  });

  it("résilie quand l'organisation n'a plus aucun membre (compte retiré auparavant)", () => {
    expect(decideOrganizationDeletion("partant", { organizationId: "o", members: [] })).toEqual({
      organizationId: "o",
      action: "release",
    });
  });

  it("refuse quand le compte est le seul propriétaire et que d'autres membres restent", () => {
    const members = [member("partant", "owner", 1), member("resp", "admin", 2)];
    expect(decideOrganizationDeletion("partant", { organizationId: "o", members })).toEqual({
      organizationId: "o",
      action: "blocked",
    });
  });

  it("transmet les solutions à l'autre propriétaire quand il y en a deux", () => {
    const members = [member("partant", "owner", 1), member("resp", "admin", 2), member("associe", "owner", 3)];
    expect(decideOrganizationDeletion("partant", { organizationId: "o", members })).toEqual({
      organizationId: "o",
      action: "reassign",
      newUserId: "associe",
    });
  });

  it("transmet les solutions d'un collaborateur au propriétaire, sans rien résilier", () => {
    const members = [member("proprio", "owner", 1), member("partant", "member", 2)];
    expect(decideOrganizationDeletion("partant", { organizationId: "o", members })).toEqual({
      organizationId: "o",
      action: "reassign",
      newUserId: "proprio",
    });
  });

  it("transmet aux membres restants les solutions d'un compte déjà retiré de l'équipe", () => {
    const members = [member("resp", "admin", 1), member("collab", "member", 2)];
    expect(decideOrganizationDeletion("partant", { organizationId: "o", members })).toEqual({
      organizationId: "o",
      action: "reassign",
      newUserId: "resp",
    });
  });
});
