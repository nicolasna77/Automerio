"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { actionError, runAction } from "@/lib/run-action";

const BLOCKING_STATUSES = ["PENDING_PAYMENT", "CONFIGURING", "ACTIVE"] as const;

function isOwnerRole(role: string): boolean {
  return role.split(",").some((part) => part.trim() === "owner");
}

export async function deleteOrganizationAction(organizationId: string) {
  return runAction(async () => {
    const session = await requireUser();

    const [membership, organizationCount] = await Promise.all([
      db.member.findFirst({ where: { organizationId, userId: session.user.id } }),
      db.member.count({ where: { userId: session.user.id } }),
    ]);

    if (!membership) throw actionError("noOrganizationAccess");
    // Vérifié avant toute écriture : un simple membre ne doit rien pouvoir
    // effacer, pas même l'historique des solutions résiliées.
    if (!isOwnerRole(membership.role)) throw actionError("organizationDeleteOwnerOnly");
    if (organizationCount <= 1) throw actionError("keepOneOrganization");

    // ClientService.organization est en onDelete: Restrict : les solutions
    // résiliées doivent partir avec l'organisation. Tout se fait dans une
    // seule transaction (relecture des solutions en cours comprise), pour
    // qu'un échec n'efface jamais l'historique d'une organisation qui reste.
    // Les membres et invitations suivent par cascade ; une session dont
    // l'organisation active disparaît retombe sur la première organisation
    // restante (getActiveOrganizationContext).
    await db.$transaction(async (tx) => {
      const blockingCount = await tx.clientService.count({
        where: { organizationId, status: { in: [...BLOCKING_STATUSES] } },
      });
      if (blockingCount > 0) throw actionError("organizationHasServices");

      await tx.clientService.deleteMany({ where: { organizationId, status: "CANCELED" } });
      await tx.session.updateMany({
        where: { activeOrganizationId: organizationId },
        data: { activeOrganizationId: null },
      });
      await tx.organization.delete({ where: { id: organizationId } });
    });

    revalidatePath("/dashboard", "layout");
  });
}
