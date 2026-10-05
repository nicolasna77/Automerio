"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { ActionError, actionError, runAction } from "@/lib/run-action";
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

async function loadTeam(organizationId: string, actorUserId: string) {
  const members = await db.member.findMany({
    where: { organizationId },
    select: { id: true, userId: true, role: true },
  });
  const actor = members.find((m) => m.userId === actorUserId);
  if (!actor) throw actionError("noOrganizationAccess");
  return { members, actor };
}

function enforce(verdict: Verdict) {
  if (!verdict.ok) throw new ActionError(verdict.reason);
}

type TeamRow = TeamMember & { id: string };

function findTarget(members: TeamRow[], memberId: string): TeamRow {
  const target = members.find((m) => m.id === memberId);
  if (!target) throw actionError("notAMember");
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
      throw actionError("tooManyTries");
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      throw actionError("invalidEmail");
    }
    if (!isInvitableRole(role)) {
      throw actionError("roleNotAllowed");
    }

    const { members, actor } = await loadTeam(organizationId, session.user.id);
    enforce(canInvite(actor));

    const alreadyMember = await db.member.findFirst({
      where: { organizationId, user: { email: trimmedEmail } },
      select: { id: true },
    });
    if (alreadyMember) {
      throw actionError("alreadyMember");
    }
    if (members.length === 0) {
      throw actionError("noMembers");
    }

    try {
      await auth.api.createInvitation({
        body: { email: trimmedEmail, role, organizationId, resend: true },
        headers: await headers(),
      });
    } catch (err) {
      console.error("[organisation] invitation refusée :", err);
      throw actionError("inviteFailed");
    }

    revalidatePath("/dashboard/organization");
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

    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      select: { organizationId: true },
    });
    if (!invitation || invitation.organizationId !== organizationId) {
      throw actionError("invitationGone");
    }

    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    revalidatePath("/dashboard/organization");
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

    revalidatePath("/dashboard/organization");
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

    revalidatePath("/dashboard/organization");
  });
}

export async function transferOwnershipAction(organizationId: string, memberId: string) {
  return runAction(async () => {
    const session = await requireUser();
    const { members, actor } = await loadTeam(organizationId, session.user.id);
    const target = findTarget(members, memberId);
    enforce(canTransferOwnership(actor, target));

    await db.$transaction(async (tx) => {
      const demoted = await tx.member.updateMany({
        where: { id: actor.id, role: actor.role },
        data: { role: "admin" },
      });
      if (demoted.count === 0) {
        throw actionError("roleChangedMeanwhile");
      }
      await tx.member.update({ where: { id: target.id }, data: { role: "owner" } });
    });

    revalidatePath("/dashboard/organization");
  });
}
