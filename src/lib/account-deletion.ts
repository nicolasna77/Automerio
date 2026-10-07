import { APIError } from "better-auth/api";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { releasePhoneNumber } from "@/lib/twilio";

const organizationsByDeletedUser = new Map<string, string[]>();

export type OrganizationMemberSnapshot = { userId: string; role: string; createdAt: Date };

export type OrganizationSnapshot = {
  organizationId: string;
  members: OrganizationMemberSnapshot[];
};

// Ce que la suppression d'un compte fait de chaque organisation touchée :
// - blocked : le compte en est le seul propriétaire alors que d'autres
//   membres restent — la suppression est refusée (transmettre la propriété) ;
// - reassign : d'autres membres restent — les solutions créées par le compte
//   passent à `newUserId` et continuent de tourner (abonnement, numéro) ;
// - release : plus personne ne reste — les solutions sont résiliées et le
//   numéro libéré, puis supprimées avec le compte.
export type OrganizationDeletionDecision =
  | { organizationId: string; action: "blocked" }
  | { organizationId: string; action: "reassign"; newUserId: string }
  | { organizationId: string; action: "release" };

function hasRole(role: string, expected: string): boolean {
  return role.split(",").some((part) => part.trim() === expected);
}

// Successeur des solutions du compte supprimé : un propriétaire, sinon un
// responsable, sinon le membre le plus ancien.
export function chooseSuccessor(
  departingUserId: string,
  members: OrganizationMemberSnapshot[]
): OrganizationMemberSnapshot | null {
  const others = members
    .filter((m) => m.userId !== departingUserId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return (
    others.find((m) => hasRole(m.role, "owner")) ??
    others.find((m) => hasRole(m.role, "admin")) ??
    others[0] ??
    null
  );
}

export function decideOrganizationDeletion(
  departingUserId: string,
  organization: OrganizationSnapshot
): OrganizationDeletionDecision {
  const { organizationId, members } = organization;
  const departing = members.find((m) => m.userId === departingUserId);
  const others = members.filter((m) => m.userId !== departingUserId);
  if (others.length === 0) return { organizationId, action: "release" };

  const isSoleOwner =
    departing !== undefined &&
    hasRole(departing.role, "owner") &&
    !others.some((m) => hasRole(m.role, "owner"));
  if (isSoleOwner) return { organizationId, action: "blocked" };

  const successor = chooseSuccessor(departingUserId, members);
  return successor
    ? { organizationId, action: "reassign", newUserId: successor.userId }
    : { organizationId, action: "release" };
}

async function refuse(key: "deleteAccountHasAuditLog" | "deleteAccountSoleOwner"): Promise<never> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Actions" });
  throw new APIError("FORBIDDEN", { message: t(key) });
}

export async function prepareAccountDeletion(userId: string): Promise<void> {
  const [auditEntries, services, memberships] = await Promise.all([
    db.auditLog.count({ where: { actorId: userId } }),
    db.clientService.findMany({
      where: { userId },
      select: {
        organizationId: true,
        status: true,
        stripeSubscriptionId: true,
        externalPhoneNumberSid: true,
      },
    }),
    db.member.findMany({ where: { userId }, select: { organizationId: true } }),
  ]);

  if (auditEntries > 0) await refuse("deleteAccountHasAuditLog");

  // Organisations dont le compte est membre, et celles où il a créé une
  // solution avant d'en être retiré : chacune est examinée.
  const organizationIds = [
    ...new Set([
      ...memberships.map((m) => m.organizationId),
      ...services.map((s) => s.organizationId),
    ]),
  ];
  const members = await db.member.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { organizationId: true, userId: true, role: true, createdAt: true },
  });
  const decisions = organizationIds.map((organizationId) =>
    decideOrganizationDeletion(userId, {
      organizationId,
      members: members.filter((m) => m.organizationId === organizationId),
    })
  );

  if (decisions.some((d) => d.action === "blocked")) await refuse("deleteAccountSoleOwner");

  // Les solutions d'une organisation qui garde des membres restent en
  // service : elles changent seulement de créateur, avant que la cascade
  // ClientService.userId ne les emporte avec le compte.
  const reassignments = decisions.filter((d) => d.action === "reassign");
  if (reassignments.length > 0) {
    await db.$transaction(
      reassignments.map((d) =>
        db.clientService.updateMany({
          where: { userId, organizationId: d.organizationId },
          data: { userId: d.newUserId },
        })
      )
    );
  }

  const released = new Set(
    decisions.filter((d) => d.action === "release").map((d) => d.organizationId)
  );
  for (const service of services) {
    if (!released.has(service.organizationId) || service.status === "CANCELED") continue;
    if (service.stripeSubscriptionId) {
      await stripeClient.subscriptions
        .cancel(service.stripeSubscriptionId)
        .catch((err) => console.error("[suppression] résiliation Stripe impossible :", err));
    }
    if (service.externalPhoneNumberSid) {
      await releasePhoneNumber(service.externalPhoneNumberSid).catch((err) =>
        console.error("[suppression] libération du numéro impossible :", err)
      );
    }
  }

  organizationsByDeletedUser.set(
    userId,
    memberships.map((m) => m.organizationId)
  );
}

export async function removeOrphanOrganizations(userId: string): Promise<void> {
  const organizationIds = organizationsByDeletedUser.get(userId) ?? [];
  organizationsByDeletedUser.delete(userId);
  if (organizationIds.length === 0) return;

  await db.organization.deleteMany({
    where: {
      id: { in: organizationIds },
      members: { none: {} },
      clientServices: { none: {} },
    },
  });
}
