import { db } from "@/lib/db";
import { isOrganizationManager } from "@/lib/organization-roles";
import { getSession } from "@/lib/session";

export type Membership = { organizationId: string; role: string };
export type Viewer = { memberships: Membership[] };
export type OwnedResource = { organizationId: string };

export function canReadClientService(
  clientService: OwnedResource,
  viewer: Viewer
): boolean {
  return viewer.memberships.some(
    (m) => m.organizationId === clientService.organizationId
  );
}

export function canManageClientServiceBilling(
  clientService: OwnedResource,
  viewer: Viewer
): boolean {
  return viewer.memberships.some(
    (m) =>
      m.organizationId === clientService.organizationId &&
      isOrganizationManager(m.role)
  );
}

// L'utilisateur connecté est-il responsable de cette organisation ? Sert à
// n'afficher que les commandes que le serveur acceptera.
export async function canManageOrganization(organizationId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return canManageClientServiceBilling({ organizationId }, await viewerOf(session.user.id));
}

export async function viewerOf(userId: string): Promise<Viewer> {
  const memberships = await db.member.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  return { memberships };
}

export async function assertCanReadClientService(
  clientServiceId: string,
  userId: string
): Promise<boolean> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { organizationId: true },
  });
  if (!clientService) return false;
  return canReadClientService(clientService, await viewerOf(userId));
}
