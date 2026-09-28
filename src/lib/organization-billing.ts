import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

export async function organizationCustomerId(
  organizationId: string
): Promise<string | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });
  return organization?.stripeCustomerId ?? null;
}

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
    metadata: { organizationId },
  });

  const { count } = await db.organization.updateMany({
    where: { id: organizationId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });

  if (count === 0) {
    const winner = await organizationCustomerId(organizationId);
    if (winner) return winner;
  }

  return customer.id;
}
