export const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Responsable",
  member: "Collaborateur",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Gère l'entreprise, l'équipe et les paiements.",
  admin: "Gère l'équipe et les paiements, comme le propriétaire.",
  member: "Consulte et configure les solutions, sans engager de dépense.",
};

export const INVITABLE_ROLES = ["admin", "member"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITABLE_ROLE_ITEMS: Record<string, string> = Object.fromEntries(
  INVITABLE_ROLES.map((role) => [role, ROLE_LABELS[role]])
);

const MANAGER_ROLES = new Set(["owner", "admin"]);

export type TeamMember = { userId: string; role: string };

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

// Le champ `role` de better-auth peut cumuler plusieurs rôles, séparés par
// des virgules (« owner,admin ») : seule cette fonction le découpe.
export function hasOrganizationRole(role: string, expected: string): boolean {
  return role.split(",").some((part) => part.trim() === expected);
}

export function isOrganizationManager(role: string): boolean {
  return role.split(",").some((part) => MANAGER_ROLES.has(part.trim()));
}

function isOwner(member: TeamMember): boolean {
  return hasOrganizationRole(member.role, "owner");
}

function ownerCount(team: TeamMember[]): number {
  return team.filter(isOwner).length;
}

// Refus exprimé par une clé de messages/*.json (espace « Actions ») : le
// serveur la traduit (runAction, ou auth.ts pour l'API better-auth).
export type TeamRuleKey =
  | "teamManagersOnly"
  | "teamKeepOwner"
  | "teamOwnerProtected"
  | "roleNotAllowed"
  | "transferOwnerOnly"
  | "alreadyOwnerSelf"
  | "alreadyOwnerMember";

export type Verdict = { ok: true } | { ok: false; key: TeamRuleKey };

const NOT_MANAGER: TeamRuleKey = "teamManagersOnly";
const LAST_OWNER: TeamRuleKey = "teamKeepOwner";
const OWNER_IS_SACRED: TeamRuleKey = "teamOwnerProtected";

export function canRemoveMember(
  actor: TeamMember,
  target: TeamMember,
  team: TeamMember[]
): Verdict {
  if (!isOrganizationManager(actor.role)) return { ok: false, key: NOT_MANAGER };
  if (isOwner(target) && !isOwner(actor)) {
    return { ok: false, key: OWNER_IS_SACRED };
  }
  if (isOwner(target) && ownerCount(team) <= 1) {
    return { ok: false, key: LAST_OWNER };
  }
  return { ok: true };
}

export function canChangeRole(
  actor: TeamMember,
  target: TeamMember,
  nextRole: string,
  team: TeamMember[]
): Verdict {
  if (!isOrganizationManager(actor.role)) return { ok: false, key: NOT_MANAGER };
  if (!isInvitableRole(nextRole)) {
    return { ok: false, key: "roleNotAllowed" };
  }
  if (isOwner(target) && !isOwner(actor)) {
    return { ok: false, key: OWNER_IS_SACRED };
  }
  if (isOwner(target) && ownerCount(team) <= 1) {
    return { ok: false, key: LAST_OWNER };
  }
  return { ok: true };
}

export function canTransferOwnership(actor: TeamMember, target: TeamMember): Verdict {
  if (!isOwner(actor)) {
    return { ok: false, key: "transferOwnerOnly" };
  }
  if (target.userId === actor.userId) {
    return { ok: false, key: "alreadyOwnerSelf" };
  }
  if (isOwner(target)) {
    return { ok: false, key: "alreadyOwnerMember" };
  }
  return { ok: true };
}

export function canInvite(actor: TeamMember): Verdict {
  return isOrganizationManager(actor.role)
    ? { ok: true }
    : { ok: false, key: NOT_MANAGER };
}
