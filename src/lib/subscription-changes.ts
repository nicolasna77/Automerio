import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { getIncludedVatRateId } from "@/lib/stripe-billing";

/**
 * Changer le quota d'un abonnement en cours.
 *
 * La difference est prelevee tout de suite, au prorata des jours restants :
 * le client augmente parce qu'il manque de minutes maintenant, les lui donner
 * au mois prochain ne repondrait pas a sa demande — il depasserait entre-temps
 * au tarif fort, plus cher que l'augmentation.
 */

/**
 * La ligne recurrente de l'abonnement.
 *
 * Cherchee, non prise au premier rang : la premiere facture porte aussi les
 * frais de mise en place, et rien ne garantit l'ordre que Stripe renvoie.
 */
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
  /** Ce qui sera preleve aujourd'hui, en centimes. Zero quand rien n'est du. */
  immediateChargeCents: number;
};

/**
 * Porte le nouveau tarif sur l'abonnement Stripe et facture l'ecart.
 *
 * `always_invoice` emet la facture de prorata sur-le-champ plutot que de
 * l'attendre a la prochaine echeance : sans cela le client obtiendrait ses
 * minutes sans rien payer avant des semaines, et une baisse ne lui rendrait
 * rien avant autant.
 */
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
          // Le produit de la ligne en cours, non un nouveau : les factures du
          // client restent rattachees au meme article, avant et apres.
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

/**
 * Ce que la facture de prorata vient de prelever, pour le dire au client.
 *
 * Renvoie zero si rien n'est trouve : afficher un montant faux serait pire que
 * de n'en afficher aucun, et Stripe reste la source de verite.
 */
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
