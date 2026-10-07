import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { slugify } from "@/lib/utils";

export type OrganizationSummary = { id: string; name: string };

export type ActiveOrganizationContext = {
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
};

async function fetchMemberOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const memberships = await db.member.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.organization);
}

export const getActiveOrganizationContext = cache(
  async (): Promise<ActiveOrganizationContext | null> => {
    const session = await getSession();
    if (!session) return null;

    let organizations = await fetchMemberOrganizations(session.user.id);

    if (organizations.length === 0) {
      const { pendingOrganizationName } = await db.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { pendingOrganizationName: true },
      });
      const name =
        pendingOrganizationName?.trim().slice(0, 80) || session.user.name || "Mon entreprise";
      await auth.api.createOrganization({
        body: { name, slug: slugify(name), userId: session.user.id },
      });
      if (pendingOrganizationName !== null) {
        await db.user.update({
          where: { id: session.user.id },
          data: { pendingOrganizationName: null },
        });
      }
      organizations = await fetchMemberOrganizations(session.user.id);
    }
    if (organizations.length === 0) return null;

    const active =
      organizations.find((o) => o.id === session.session.activeOrganizationId) ??
      organizations[0];

    return { active, organizations };
  }
);

export async function requireActiveOrganization(): Promise<ActiveOrganizationContext> {
  const ctx = await getActiveOrganizationContext();
  // Session expirée : retour à la connexion, comme requireUser (y compris
  // depuis une Server Action, où runAction laisse passer la redirection).
  if (!ctx && !(await getSession())) redirect("/login");
  if (!ctx) throw new Error("Aucune organisation trouvée pour ce compte.");
  return ctx;
}
