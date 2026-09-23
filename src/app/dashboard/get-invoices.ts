import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { organizationCustomerId } from "@/lib/organization-billing";

export type InvoiceDTO = {
  id: string;
  number: string | null;
  status: Stripe.Invoice.Status | null;
  createdAt: Date;
  amountPaidCents: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  serviceName: string | null;
};

function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

export async function getMyInvoices(
  organizationId: string
): Promise<InvoiceDTO[]> {
  // Les factures de l'entreprise, non celles de la personne qui regarde : un
  // membre invite n'a rien paye lui-meme et verrait sinon une page vide.
  const customerId = await organizationCustomerId(organizationId);
  if (!customerId) return [];

  const [stripeInvoices, clientServices] = await Promise.all([
    stripeClient.invoices.list({ customer: customerId, limit: 100 }),
    db.clientService.findMany({
      where: { organizationId },
      select: { id: true, stripeSubscriptionId: true, name: true },
    }),
  ]);

  const nameBySubscriptionId = new Map(
    clientServices
      .filter((cs) => cs.stripeSubscriptionId)
      .map((cs) => [cs.stripeSubscriptionId as string, cs.name])
  );
  const nameByClientServiceId = new Map(clientServices.map((cs) => [cs.id, cs.name]));

  return stripeInvoices.data
    .map((invoice) => {
      const subscriptionId = subscriptionIdOf(invoice);
      const serviceName = subscriptionId
        ? nameBySubscriptionId.get(subscriptionId)
        : nameByClientServiceId.get(invoice.metadata?.clientServiceId ?? "");
      return { invoice, serviceName };
    })
    .filter(({ serviceName }) => serviceName !== undefined)
    .map(({ invoice, serviceName }) => ({
      id: invoice.id!,
      number: invoice.number,
      status: invoice.status,
      createdAt: new Date(invoice.created * 1000),
      amountPaidCents: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      serviceName: serviceName ?? null,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
