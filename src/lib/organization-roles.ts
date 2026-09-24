/**
 * Les roles d'une organisation, et ce qu'ils autorisent.
 *
 * better-auth en definit trois. Le client n'en voit que deux a l'invitation :
 * `owner` reste celui du createur et ne s'attribue pas depuis l'interface —
 * deux proprietaires sur une meme entreprise poseraient la question de qui
 * paie, tant que la facturation vit sur l'utilisateur (#81).
 */

export const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Responsable",
  member: "Collaborateur",
};

/** Ce qu'un role permet, en une ligne, pour l'interface. */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Gère l'entreprise, l'équipe et les paiements.",
  admin: "Gère l'équipe et les paiements, comme le propriétaire.",
  member: "Consulte et configure les solutions, sans engager de dépense.",
};

/** Les roles qu'on peut confier depuis l'interface. */
export const INVITABLE_ROLES = ["admin", "member"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/**
 * La table que `<Select items>` attend : Base UI y lit le libelle a afficher
 * dans le declencheur. Sans elle, il montrerait la valeur brute — « member »
 * au lieu de « Collaborateur ».
 */
export const INVITABLE_ROLE_ITEMS: Record<string, string> = Object.fromEntries(
  INVITABLE_ROLES.map((role) => [role, ROLE_LABELS[role]])
);

/** Les roles qui engagent : argent, resiliation, et gestion de l'equipe. */
const MANAGER_ROLES = new Set(["owner", "admin"]);

export type TeamMember = { userId: string; role: string };

/** Le libelle lisible d'un role, ou le role brut s'il est inconnu. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

/**
 * better-auth range les roles multiples dans une seule colonne, separes par
 * des virgules : comparer la chaine entiere manquerait « admin,member ».
 */
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

/**
 * Retirer un membre. Les refus sont ordonnes du plus general au plus precis,
 * pour que le message explique la vraie raison plutot que la premiere
 * rencontree.
 */
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

/**
 * Changer le role d'un membre. `owner` ne s'attribue pas ici : il se transmet,
 * ce qui est un autre geste (`canTransferOwnership`).
 */
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

/**
 * Transmettre la propriete : seul le proprietaire le peut, et a un autre
 * membre. Il devient alors responsable — il garde la gestion, pas le titre.
 */
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

/** Inviter quelqu'un : le role de gestion suffit. */
export function canInvite(actor: TeamMember): Verdict {
  return isOrganizationManager(actor.role)
    ? { ok: true }
    : { ok: false, reason: NOT_MANAGER };
}
