import type Stripe from "stripe";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { releasePhoneNumber } from "@/lib/twilio";
import { logServiceEvent } from "@/lib/service-events";
import { sendPaymentFailedEmail, sendServiceCanceledEmail } from "@/lib/email/notifications";
import { billFinalOverage, billOverageOnInvoice } from "@/lib/overage-billing";
import { CLEARED_META_CONNECTION } from "@/lib/meta-connection";

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

// Texte enregistré avec l'événement, puis affiché au client : il vient de
// messages/*.json (espace « ServiceEvents »), dans la langue par défaut, car
// un webhook n'a pas de requête de l'utilisateur.
async function eventMessage(key: "paymentRefused" | "paymentFailed" | "paymentRecovered"): Promise<string> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "ServiceEvents" });
  return t(key);
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
      await eventMessage("paymentRefused")
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
      await eventMessage("paymentFailed")
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
    await logServiceEvent(id, "PAYMENT_RECEIVED", await eventMessage("paymentRecovered"));
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
      pausedAt: null,
      externalPhoneNumber: null,
      externalPhoneNumberSid: null,
      ...CLEARED_META_CONNECTION,
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
      await billFinalOverage(event.data.object).catch((err) =>
        console.error("[stripe] facturation du dernier dépassement impossible :", err)
      );
      await endSubscription(event.data.object.id);
      return;
  }
}
