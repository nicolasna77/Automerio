import { describe, expect, it } from "vitest";
import {
  decideInvitation,
  decideLeave,
  decideRemoval,
  decideRoleChange,
  type TeamRow,
} from "./organization-guards";

const owner: TeamRow = { id: "m-owner", userId: "u-owner", role: "owner", email: "owner@x.fr" };
const admin: TeamRow = { id: "m-admin", userId: "u-admin", role: "admin", email: "admin@x.fr" };
const member: TeamRow = { id: "m-member", userId: "u-member", role: "member", email: "Member@x.fr" };
const team = [owner, admin, member];

describe("decideInvitation", () => {
  it("laisse better-auth répondre quand l'invitant n'est pas membre", () => {
    expect(decideInvitation(undefined, "member")).toBeNull();
  });

  it("autorise un responsable à inviter un collaborateur ou un responsable", () => {
    expect(decideInvitation(admin, "member")).toEqual({ ok: true });
    expect(decideInvitation(admin, "admin")).toEqual({ ok: true });
  });

  it("refuse l'invitation d'un propriétaire, même par le propriétaire", () => {
    expect(decideInvitation(admin, "owner")).toEqual({ ok: false, key: "roleNotAllowed" });
    expect(decideInvitation(owner, "owner")).toEqual({ ok: false, key: "roleNotAllowed" });
    expect(decideInvitation(owner, "member,owner")).toEqual({ ok: false, key: "roleNotAllowed" });
  });

  it("refuse qu'un collaborateur invite", () => {
    expect(decideInvitation(member, "member")).toMatchObject({ ok: false });
  });
});

describe("decideRoleChange", () => {
  it("laisse better-auth répondre pour un membre inconnu", () => {
    expect(decideRoleChange(team, "u-inconnu", member.id, "admin")).toBeNull();
    expect(decideRoleChange(team, admin.userId, "m-inconnu", "admin")).toBeNull();
  });

  it("refuse qu'un responsable promeuve propriétaire", () => {
    expect(decideRoleChange(team, admin.userId, member.id, "owner")).toMatchObject({ ok: false });
  });

  it("refuse la promotion au rôle de propriétaire hors transfert de propriété", () => {
    expect(decideRoleChange(team, owner.userId, member.id, "owner")).toMatchObject({ ok: false });
    expect(decideRoleChange(team, owner.userId, member.id, ["admin", "owner"])).toEqual({
      ok: false,
      key: "roleNotAllowed",
    });
  });

  it("refuse qu'un responsable rétrograde le propriétaire", () => {
    expect(decideRoleChange(team, admin.userId, owner.id, "member")).toMatchObject({ ok: false });
  });

  it("autorise un responsable à changer le rôle d'un collaborateur", () => {
    expect(decideRoleChange(team, admin.userId, member.id, "admin")).toEqual({ ok: true });
  });
});

describe("decideRemoval", () => {
  it("refuse qu'un collaborateur retire quelqu'un", () => {
    expect(decideRemoval(team, member.userId, admin.id)).toMatchObject({ ok: false });
  });

  it("refuse qu'un responsable retire le propriétaire, désigné par son e-mail", () => {
    expect(decideRemoval(team, admin.userId, "OWNER@x.fr")).toMatchObject({ ok: false });
  });

  it("autorise un responsable à retirer un collaborateur", () => {
    expect(decideRemoval(team, admin.userId, member.id)).toEqual({ ok: true });
    expect(decideRemoval(team, admin.userId, "member@x.fr")).toEqual({ ok: true });
  });

  it("laisse better-auth répondre pour une cible inconnue", () => {
    expect(decideRemoval(team, admin.userId, "personne@x.fr")).toBeNull();
  });
});

describe("decideLeave", () => {
  it("laisse better-auth répondre quand le membre est inconnu", () => {
    expect(decideLeave(team, "u-inconnu")).toBeNull();
  });

  it("refuse que le seul propriétaire quitte une organisation où d'autres restent", () => {
    expect(decideLeave(team, owner.userId)).toEqual({ ok: false, key: "leaveSoleOwner" });
    expect(decideLeave([{ ...owner, role: "owner,admin" }, member], owner.userId)).toEqual({
      ok: false,
      key: "leaveSoleOwner",
    });
  });

  it("autorise un propriétaire à partir quand un autre propriétaire reste", () => {
    const coOwner: TeamRow = { id: "m-owner2", userId: "u-owner2", role: "owner", email: "o2@x.fr" };
    expect(decideLeave([...team, coOwner], owner.userId)).toEqual({ ok: true });
  });

  it("autorise un responsable ou un collaborateur à partir", () => {
    expect(decideLeave(team, admin.userId)).toEqual({ ok: true });
    expect(decideLeave(team, member.userId)).toEqual({ ok: true });
  });

  it("ne bloque pas le dernier membre (better-auth refuse lui-même le départ du seul propriétaire)", () => {
    expect(decideLeave([owner], owner.userId)).toEqual({ ok: true });
  });
});
