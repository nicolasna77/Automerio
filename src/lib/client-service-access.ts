import { db } from "@/lib/db";
import { isOrganizationManager } from "@/lib/organization-roles";

/**
 * Qui a le droit de quoi sur une prestation.
 *
 * Une prestation appartient a une organisation, et c'est l'appartenance a
 * celle-ci qui ouvre l'acces — non le fait de l'avoir creee. Sans cela, un
 * collegue voit la solution dans les listes du tableau de bord, qui filtrent
 * deja par organisation, et recoit un 404 en cliquant dessus.
 *
 * Deux niveaux, et non un seul. Consulter et configurer n'engagent rien :
 * tout membre le peut. Resilier, acheter un numero ou reprendre un paiement
 * coutent de l'argent ou coupent un service en marche : ces gestes demandent
 * le role `owner` ou `admin`, que better-auth donne au createur de
 * l'organisation et a qui on le confie ensuite.
 *
 * `ClientService.userId` demeure, mais comme trace de qui a souscrit — plus
 * comme un droit.
 */

export type Membership = { organizationId: string; role: string };
export type Viewer = { memberships: Membership[] };
export type OwnedResource = { organizationId: string };

/** Consulter et configurer : il suffit d'appartenir a l'organisation. */
export function canReadClientService(
  clientService: OwnedResource,
  viewer: Viewer
): boolean {
  return viewer.memberships.some(
    (m) => m.organizationId === clientService.organizationId
  );
}

/** Engager de l'argent ou couper le service : l'appartenance et le role. */
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

/** Les organisations dont l'utilisateur est membre, et a quel titre, maintenant. */
export async function viewerOf(userId: string): Promise<Viewer> {
  const memberships = await db.member.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  return { memberships };
}

/**
 * Cet utilisateur peut-il consulter cette prestation ? Faux aussi quand elle
 * n'existe pas : rien ne distingue alors « inexistante » d'« interdite ».
 */
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
