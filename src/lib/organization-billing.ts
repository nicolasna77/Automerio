import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

/**
 * Le client Stripe d'une entreprise.
 *
 * La facturation suit l'organisation, non la personne qui a commande : une
 * prestation appartient a une organisation et se partage entre ses membres,
 * ses factures doivent donc franchir la meme frontiere. Sans cela, un membre
 * invite verrait les solutions de l'entreprise et une page Paiements vide.
 *
 * Le client est cree a la premiere commande seulement. Le creer a l'inscription
 * remplirait Stripe de fiches pour des entreprises qui n'acheteront jamais.
 */

/** Le client Stripe de l'organisation, ou `null` si elle n'a rien commande. */
export async function organizationCustomerId(
  organizationId: string
): Promise<string | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });
  return organization?.stripeCustomerId ?? null;
}

/**
 * Le client Stripe de l'organisation, cree s'il n'existe pas encore.
 *
 * L'ecriture en base est conditionnee a l'absence de client (`updateMany` avec
 * `stripeCustomerId: null`) : si deux commandes partent en meme temps, la
 * seconde ne remplace pas le client de la premiere. Elle abandonne le sien,
 * qui reste une fiche vide dans Stripe plutot qu'un second client facturable.
 */
export async function getOrCreateOrganizationCustomer(
  organizationId: string,
  fallbackEmail: string
): Promise<string> {
  const existing = await organizationCustomerId(organizationId);
  if (existing) return existing;

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true },
  });

  const customer = await stripeClient.customers.create({
    name: organization.name,
    email: fallbackEmail,
    // Permet de remonter de Stripe vers l'entreprise sans passer par la base.
    metadata: { organizationId },
  });

  const { count } = await db.organization.updateMany({
    where: { id: organizationId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });

  if (count === 0) {
    // Une commande concurrente a gagne : on garde la sienne et on abandonne
    // celle qu'on vient de creer, pour ne pas facturer sur deux fiches.
    const winner = await organizationCustomerId(organizationId);
    if (winner) return winner;
  }

  return customer.id;
}
