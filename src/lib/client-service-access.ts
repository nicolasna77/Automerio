import { db } from "@/lib/db";

/**
 * Decide si un utilisateur peut lire une prestation, a partir de faits deja
 * lus. Pure, donc verifiable sans base.
 *
 * Deux conditions, et non une. `userId` seul ne suffit pas : une prestation
 * appartient aussi a une organisation, et quelqu'un retire de celle-ci ne doit
 * plus en voir le contenu — journaux d'appels et numeros des appelants compris
 * — meme si la ligne porte encore son identifiant. La condition
 * d'appartenance est ajoutee a celle de propriete, jamais substituee : elle ne
 * peut donc que restreindre l'acces par rapport a l'etat anterieur.
 */
export function canReadClientService(
  clientService: { userId: string; organizationId: string },
  viewer: { userId: string; organizationIds: string[] }
): boolean {
  return (
    clientService.userId === viewer.userId &&
    viewer.organizationIds.includes(clientService.organizationId)
  );
}

/** Les organisations dont l'utilisateur est effectivement membre, maintenant. */
export async function viewerOrganizationIds(userId: string): Promise<string[]> {
  const memberships = await db.member.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return memberships.map((m) => m.organizationId);
}

/**
 * La question complete, posee a la base : cet utilisateur peut-il lire cette
 * prestation ? Renvoie faux si elle n'existe pas, pour ne pas distinguer
 * « inexistante » de « interdite ».
 */
export async function assertCanReadClientService(
  clientServiceId: string,
  userId: string
): Promise<boolean> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { userId: true, organizationId: true },
  });
  if (!clientService) return false;
  return canReadClientService(clientService, {
    userId,
    organizationIds: await viewerOrganizationIds(userId),
  });
}
