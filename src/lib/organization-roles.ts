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

export function isOrganizationManager(role: string): boolean {
  return role.split(",").some((part) => MANAGER_ROLES.has(part.trim()));
}

function isOwner(member: TeamMember): boolean {
  return member.role.split(",").some((part) => part.trim() === "owner");
}

function ownerCount(team: TeamMember[]): number {
  return team.filter(isOwner).length;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

const NOT_MANAGER =
  "Seuls le propriétaire et les responsables peuvent gérer l'équipe.";
const LAST_OWNER = "L'organisation doit garder un propriétaire.";
const OWNER_IS_SACRED =
  "Seul le propriétaire peut modifier ou retirer un autre propriétaire.";

export function canRemoveMember(
  actor: TeamMember,
  target: TeamMember,
  team: TeamMember[]
): Verdict {
  if (!isOrganizationManager(actor.role)) return { ok: false, reason: NOT_MANAGER };
  if (isOwner(target) && !isOwner(actor)) {
    return { ok: false, reason: OWNER_IS_SACRED };
  }
  if (isOwner(target) && ownerCount(team) <= 1) {
    return { ok: false, reason: LAST_OWNER };
  }
  return { ok: true };
}

export function canChangeRole(
  actor: TeamMember,
  target: TeamMember,
  nextRole: string,
  team: TeamMember[]
): Verdict {
  if (!isOrganizationManager(actor.role)) return { ok: false, reason: NOT_MANAGER };
  if (!isInvitableRole(nextRole)) {
    return { ok: false, reason: "Ce rôle ne peut pas être attribué ici." };
  }
  if (isOwner(target) && !isOwner(actor)) {
    return { ok: false, reason: OWNER_IS_SACRED };
  }
  if (isOwner(target) && ownerCount(team) <= 1) {
    return { ok: false, reason: LAST_OWNER };
  }
  return { ok: true };
}

export function canTransferOwnership(actor: TeamMember, target: TeamMember): Verdict {
  if (!isOwner(actor)) {
    return { ok: false, reason: "Seul le propriétaire peut transmettre la propriété." };
  }
  if (target.userId === actor.userId) {
    return { ok: false, reason: "Vous êtes déjà propriétaire de cette organisation." };
  }
  if (isOwner(target)) {
    return { ok: false, reason: "Ce membre est déjà propriétaire." };
  }
  return { ok: true };
}

export function canInvite(actor: TeamMember): Verdict {
  return isOrganizationManager(actor.role)
    ? { ok: true }
    : { ok: false, reason: NOT_MANAGER };
}
