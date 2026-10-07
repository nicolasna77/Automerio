// Règles d'équipe rejouées sur les points d'entrée de better-auth
// (/api/auth/organization/*). Les actions du tableau de bord les appliquent
// déjà avant d'appeler better-auth ; sans ce garde-fou, un appel direct à
// l'API n'aurait que les règles par défaut du plugin organization.

import {
  canChangeRole,
  canInvite,
  canRemoveMember,
  hasOrganizationRole,
  isInvitableRole,
  type TeamMember,
  type Verdict,
} from "@/lib/organization-roles";

export type TeamRow = TeamMember & { id: string; email: string };

export type GuardDecision = Verdict | { ok: false; key: "roleNotAllowed" | "leaveSoleOwner" };

// `null` : membre introuvable, better-auth répondra lui-même par son erreur.
export function decideInvitation(actor: TeamMember | undefined, role: string): GuardDecision | null {
  if (!actor) return null;
  const verdict = canInvite(actor);
  if (!verdict.ok) return verdict;
  const roles = splitRoles(role);
  if (roles.length !== 1 || !isInvitableRole(roles[0])) return { ok: false, key: "roleNotAllowed" };
  return { ok: true };
}

export function decideRoleChange(
  team: TeamRow[],
  actorUserId: string,
  targetMemberId: string,
  nextRole: string | string[]
): GuardDecision | null {
  const actor = team.find((m) => m.userId === actorUserId);
  const target = team.find((m) => m.id === targetMemberId);
  if (!actor || !target) return null;
  const roles = splitRoles(nextRole);
  if (roles.length !== 1) return { ok: false, key: "roleNotAllowed" };
  return canChangeRole(actor, target, roles[0], team);
}

export function decideRemoval(
  team: TeamRow[],
  actorUserId: string,
  memberIdOrEmail: string
): GuardDecision | null {
  const actor = team.find((m) => m.userId === actorUserId);
  const wanted = memberIdOrEmail.trim().toLowerCase();
  const target = memberIdOrEmail.includes("@")
    ? team.find((m) => m.email.toLowerCase() === wanted)
    : team.find((m) => m.id === memberIdOrEmail);
  if (!actor || !target) return null;
  return canRemoveMember(actor, target, team);
}

// Même règle que la suppression de compte (decideOrganizationDeletion dans
// account-deletion.ts) : le seul propriétaire ne quitte pas une organisation
// où d'autres membres restent sans en avoir transmis la propriété.
export function decideLeave(team: TeamRow[], actorUserId: string): GuardDecision | null {
  const actor = team.find((m) => m.userId === actorUserId);
  if (!actor) return null;
  const others = team.filter((m) => m.userId !== actorUserId);
  const isOwner = (m: TeamRow) => hasOrganizationRole(m.role, "owner");
  if (isOwner(actor) && others.length > 0 && !others.some(isOwner)) {
    return { ok: false, key: "leaveSoleOwner" };
  }
  return { ok: true };
}

function splitRoles(role: string | string[]): string[] {
  return (Array.isArray(role) ? role : [role])
    .flatMap((r) => r.split(","))
    .map((r) => r.trim())
    .filter(Boolean);
}
