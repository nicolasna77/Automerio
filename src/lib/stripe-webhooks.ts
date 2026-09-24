import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { releasePhoneNumber } from "@/lib/twilio";
import { logServiceEvent } from "@/lib/service-events";
import { sendPaymentFailedEmail, sendServiceCanceledEmail } from "@/lib/email/notifications";
import { billFinalOverage, billOverageOnInvoice } from "@/lib/overage-billing";

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  return idOf(invoice.parent?.subscription_details?.subscription);
}

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const clientServiceId = session.metadata?.clientServiceId;
  if (!clientServiceId) return;

  const { count } = await db.clientService.updateMany({
    where: { id: clientServiceId, status: "PENDING_PAYMENT" },
    data: {
      status: "CONFIGURING",
      paymentFailedAt: null,
      stripePaymentIntentId: idOf(session.payment_intent),
      stripeSubscriptionId: idOf(session.subscription),
    },
  });
  if (count > 0) await logServiceEvent(clientServiceId, "PAYMENT_RECEIVED");
}

async function recordFailedCheckout(session: Stripe.Checkout.Session) {
  const clientServiceId = session.metadata?.clientServiceId;
  if (!clientServiceId) return;
  const exists = await db.clientService.count({
    where: { id: clientServiceId, status: "PENDING_PAYMENT" },
  });
  if (exists > 0) {
    await logServiceEvent(
      clientServiceId,
      "PAYMENT_FAILED",
      "Votre banque a refusé le paiement. Vous pouvez le reprendre depuis vos solutions."
    );
  }
}

async function flagPaymentFailure(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdOfInvoice(invoice);
  if (!subscriptionId) return;

  const affected = await db.clientService.findMany({
    where: {
      stripeSubscriptionId: subscriptionId,
      paymentFailedAt: null,
      status: { in: ["CONFIGURING", "ACTIVE"] },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  for (const clientService of affected) {
    await db.clientService.update({
      where: { id: clientService.id },
      data: { paymentFailedAt: new Date() },
    });
    await logServiceEvent(
      clientService.id,
      "PAYMENT_FAILED",
      "Mettez à jour votre moyen de paiement pour éviter une interruption."
    );
    await sendPaymentFailedEmail(clientService.user, clientService.name);
  }
}

async function clearPaymentFailure(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdOfInvoice(invoice);
  if (!subscriptionId) return;

  const recovered = await db.clientService.findMany({
    where: { stripeSubscriptionId: subscriptionId, paymentFailedAt: { not: null } },
    select: { id: true },
  });
  for (const { id } of recovered) {
    await db.clientService.update({ where: { id }, data: { paymentFailedAt: null } });
    await logServiceEvent(id, "PAYMENT_RECEIVED", "Paiement régularisé.");
  }
}

async function endSubscription(subscriptionId: string) {
  const affected = await db.clientService.findMany({
    where: { stripeSubscriptionId: subscriptionId, status: { not: "CANCELED" } },
    include: {
      user: { select: { email: true, name: true, notificationPreferences: true } },
    },
  });
  if (affected.length === 0) return;

  await Promise.all(
    affected
      .filter((cs) => cs.externalPhoneNumberSid)
      .map((cs) =>
        releasePhoneNumber(cs.externalPhoneNumberSid!).catch((err) =>
          console.error("[stripe] libération du numéro impossible :", err)
        )
      )
  );
  await db.clientService.updateMany({
    where: { id: { in: affected.map((cs) => cs.id) } },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      paymentFailedAt: null,
      externalPhoneNumber: null,
      externalPhoneNumberSid: null,
    },
  });
  for (const clientService of affected) {
    await logServiceEvent(clientService.id, "CANCELED");
    await sendServiceCanceledEmail(clientService.user, clientService.name);
  }
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "unpaid") return;
      await fulfillCheckout(session);
      return;
    }
    case "checkout.session.async_payment_failed":
      await recordFailedCheckout(event.data.object);
      return;
    case "invoice.created":
      await billOverageOnInvoice(event.data.object);
      return;
    case "invoice.payment_failed":
      await flagPaymentFailure(event.data.object);
      return;
    case "invoice.paid":
      await clearPaymentFailure(event.data.object);
      return;
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      if (subscription.status === "unpaid") {
        await stripeClient.subscriptions
          .cancel(subscription.id)
          .catch((err) => console.error("[stripe] résiliation d'un abonnement impayé impossible :", err));
        await endSubscription(subscription.id);
      }
      return;
    }
    case "customer.subscription.deleted":
      // Le depassement de la derniere periode n'a pas de facture de
      // renouvellement ou s'ajouter. Son echec ne doit pas bloquer la resiliation.
      await billFinalOverage(event.data.object).catch((err) =>
        console.error("[stripe] facturation du dernier dépassement impossible :", err)
      );
      await endSubscription(event.data.object.id);
      return;
  }
}
