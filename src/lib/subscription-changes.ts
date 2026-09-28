import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { getIncludedVatRateId } from "@/lib/stripe-billing";

function recurringItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem {
  const item = subscription.items.data.find((line) => line.price.recurring);
  if (!item) {
    throw new Error(
      `L'abonnement ${subscription.id} n'a aucune ligne recurrente a modifier.`
    );
  }
  return item;
}

export type QuotaChange = {
  immediateChargeCents: number;
};

export async function applyMonthlyPriceChange(
  stripeSubscriptionId: string,
  newMonthlyPriceCents: number
): Promise<QuotaChange> {
  const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
  const item = recurringItem(subscription);
  const vatRateId = await getIncludedVatRateId();

  const updated = await stripeClient.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: item.id,
        price_data: {
          currency: "eur",
          unit_amount: newMonthlyPriceCents,
          recurring: { interval: "month" },
          product:
            typeof item.price.product === "string"
              ? item.price.product
              : item.price.product.id,
        },
        quantity: 1,
        tax_rates: [vatRateId],
      },
    ],
    proration_behavior: "always_invoice",
  });

  return { immediateChargeCents: await lastProrationAmount(updated) };
}

async function lastProrationAmount(subscription: Stripe.Subscription): Promise<number> {
  try {
    const invoices = await stripeClient.invoices.list({
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      limit: 1,
    });
    return invoices.data[0]?.amount_due ?? 0;
  } catch (err) {
    console.error("[abonnement] montant du prorata illisible :", err);
    return 0;
  }
}
