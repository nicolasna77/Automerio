"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { ActionError, runAction } from "@/lib/run-action";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  canChangeRole,
  canInvite,
  canRemoveMember,
  canTransferOwnership,
  isInvitableRole,
  type TeamMember,
  type Verdict,
} from "@/lib/organization-roles";

const TOO_MANY_ATTEMPTS = "Trop de tentatives. Réessayez dans quelques minutes.";

/**
 * L'equipe telle qu'elle est maintenant, et la place de celui qui agit.
 *
 * Les regles se decident sur l'equipe entiere et non sur le seul couple
 * acteur/cible : « ne pas retirer le dernier proprietaire » demande de savoir
 * combien il en reste.
 */
async function loadTeam(organizationId: string, actorUserId: string) {
  const members = await db.member.findMany({
    where: { organizationId },
    select: { id: true, userId: true, role: true },
  });
  const actor = members.find((m) => m.userId === actorUserId);
  if (!actor) throw new ActionError("Vous n'avez pas accès à cette organisation.");
  return { members, actor };
}

function enforce(verdict: Verdict) {
  if (!verdict.ok) throw new ActionError(verdict.reason);
}

type TeamRow = TeamMember & { id: string };

/**
 * better-auth designe un membre par l'identifiant de sa ligne `member`, non par
 * celui de l'utilisateur : passer le second ne retrouverait personne.
 */
function findTarget(members: TeamRow[], memberId: string): TeamRow {
  const target = members.find((m) => m.id === memberId);
  if (!target) throw new ActionError("Ce membre ne fait pas partie de l'organisation.");
  return target;
}

export async function inviteMemberAction(
  organizationId: string,
  email: string,
  role: string
) {
  return runAction(async () => {
    const session = await requireUser();
    if (!(await checkRateLimit("organization-invite", session.user.id, "1 h", 20))) {
      throw new ActionError(TOO_MANY_ATTEMPTS);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      throw new ActionError("Cette adresse e-mail n'est pas valide.");
    }
    if (!isInvitableRole(role)) {
      throw new ActionError("Ce rôle ne peut pas être attribué ici.");
    }

    const { members, actor } = await loadTeam(organizationId, session.user.id);
    enforce(canInvite(actor));

    // Deux verifications que better-auth ne fait pas a notre place, et dont
    // l'absence produirait des messages incomprehensibles.
    const alreadyMember = await db.member.findFirst({
      where: { organizationId, user: { email: trimmedEmail } },
      select: { id: true },
    });
    if (alreadyMember) {
      throw new ActionError("Cette personne fait déjà partie de l'organisation.");
    }
    if (members.length === 0) {
      throw new ActionError("Cette organisation n'a aucun membre.");
    }

    try {
      await auth.api.createInvitation({
        body: { email: trimmedEmail, role, organizationId, resend: true },
        headers: await headers(),
      });
    } catch (err) {
      console.error("[organisation] invitation refusée :", err);
      throw new ActionError("L'invitation n'a pas pu être envoyée. Réessayez.");
    }

    revalidatePath("/dashboard/organisation");
  });
}

export async function cancelInvitationAction(
  organizationId: string,
  invitationId: string
) {
  return runAction(async () => {
    const session = await requireUser();
    const { actor } = await loadTeam(organizationId, session.user.id);
    enforce(canInvite(actor));

    // L'invitation doit appartenir a cette organisation : sans ce controle,
    // son seul identifiant suffirait a annuler celle d'une autre entreprise.
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      select: { organizationId: true },
    });
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new ActionError("Cette invitation n'existe plus.");
    }

    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    revalidatePath("/dashboard/organisation");
  });
}

export async function removeMemberAction(
  organizationId: string,
  memberId: string
) {
  return runAction(async () => {
    const session = await requireUser();
    const { members, actor } = await loadTeam(organizationId, session.user.id);
    const target = findTarget(members, memberId);
    enforce(canRemoveMember(actor, target, members));

    await auth.api.removeMember({
      body: { memberIdOrEmail: target.id, organizationId },
      headers: await headers(),
    });

    revalidatePath("/dashboard/organisation");
    revalidatePath("/dashboard", "layout");
  });
}

export async function changeMemberRoleAction(
  organizationId: string,
  memberId: string,
  role: string
) {
  return runAction(async () => {
    const session = await requireUser();
    const { members, actor } = await loadTeam(organizationId, session.user.id);
    const target = findTarget(members, memberId);
    enforce(canChangeRole(actor, target, role, members));

    await auth.api.updateMemberRole({
      body: { memberId: target.id, role, organizationId },
      headers: await headers(),
    });

    revalidatePath("/dashboard/organisation");
  });
}

/**
 * Transmet la propriete a un autre membre ; l'ancien proprietaire devient
 * responsable.
 *
 * Les deux changements passent dans une seule transaction : deux appels
 * successifs a better-auth pourraient s'arreter entre les deux, et laisser
 * l'organisation avec deux proprietaires, ou aucun.
 */
export async function transferOwnershipAction(organizationId: string, memberId: string) {
  return runAction(async () => {
    const session = await requireUser();
    const { members, actor } = await loadTeam(organizationId, session.user.id);
    const target = findTarget(members, memberId);
    enforce(canTransferOwnership(actor, target));

    await db.$transaction(async (tx) => {
      // Le role lu plus haut peut avoir change depuis : deux transmissions
      // lancees ensemble vers deux membres feraient sinon deux proprietaires.
      // Seule la premiere trouve encore l'acteur dans son role de proprietaire.
      const demoted = await tx.member.updateMany({
        where: { id: actor.id, role: actor.role },
        data: { role: "admin" },
      });
      if (demoted.count === 0) {
        throw new ActionError("Votre rôle a changé entre-temps. Rechargez la page.");
      }
      await tx.member.update({ where: { id: target.id }, data: { role: "owner" } });
    });

    revalidatePath("/dashboard/organisation");
  });
}
