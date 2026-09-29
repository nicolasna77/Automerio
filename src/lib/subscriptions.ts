import type { ClientService, Service } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { formatDate, type ClientServiceStatus } from "@/lib/catalog";
import { overageCents, readClientUsageCap, type UsageCap } from "@/lib/usage-cap";
import {
  readSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/subscription-pricing";
import { formatCentsWithVat } from "@/lib/vat";

export type BillingPeriod = {
  start: Date;
  end: Date | null;
};

export type SubscriptionUsage = {
  consumedUnits: number;
  overageCents: number;
};

export type MySubscription = {
  clientServiceId: string;
  name: string;
  serviceName: string;
  serviceSlug: string;
  status: ClientServiceStatus;
  monthlyPriceCents: number;
  paymentFailedAt: Date | null;
  canceledAt: Date | null;
  period: BillingPeriod;
  renews: boolean;
  cap: UsageCap | null;
  usage: SubscriptionUsage | null;
  tier: SubscriptionTier | null;
};

export function calendarMonth(now = new Date()): BillingPeriod {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export function periodOf(subscription: Stripe.Subscription): BillingPeriod | null {
  const items = subscription.items.data;
  if (items.length === 0) return null;
  const start = Math.min(...items.map((item) => item.current_period_start));
  const end = Math.max(...items.map((item) => item.current_period_end));
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

async function fetchSubscriptions(
  ids: string[]
): Promise<Map<string, Stripe.Subscription>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await stripeClient.subscriptions.retrieve(id)] as const;
      } catch (err) {
        console.error("[abonnement] lecture Stripe impossible :", err);
        return null;
      }
    })
  );
  return new Map(entries.filter((entry) => entry !== null));
}

export async function consumedUnits(
  clientServiceId: string,
  cap: UsageCap,
  period: BillingPeriod
): Promise<number> {
  const occurredAt = { gte: period.start, ...(period.end && { lt: period.end }) };
  if (cap.unit === "MESSAGE") {
    return db.conversationMessage.count({
      where: { direction: "OUTBOUND", createdAt: occurredAt, conversation: { clientServiceId } },
    });
  }
  const where = {
    clientServiceId,
    type: "call",
    status: "completed",
    occurredAt,
  };

  if (cap.unit === "CALL") return db.usageEvent.count({ where });

  const { _sum } = await db.usageEvent.aggregate({
    where,
    _sum: { durationSec: true },
  });
  return Math.ceil((_sum.durationSec ?? 0) / 60);
}

async function toMySubscription(
  cs: ClientService & { service: Service },
  subscriptions: Map<string, Stripe.Subscription>,
  fallback: BillingPeriod
): Promise<MySubscription> {
  const subscription = cs.stripeSubscriptionId
    ? subscriptions.get(cs.stripeSubscriptionId)
    : undefined;
  const period = (subscription && periodOf(subscription)) ?? fallback;
  const cap = readClientUsageCap(cs, cs.service);
  const tracksUsage = cs.status === "ACTIVE" || cs.status === "CONFIGURING";

  const usage =
    cap && tracksUsage
      ? await consumedUnits(cs.id, cap, period).then((units) => ({
          consumedUnits: units,
          overageCents: overageCents(units, cap),
        }))
      : null;

  return {
    clientServiceId: cs.id,
    name: cs.name,
    serviceName: cs.service.name,
    serviceSlug: cs.service.slug,
    status: cs.status,
    monthlyPriceCents: cs.monthlyPriceCents ?? cs.service.monthlyPriceCents!,
    tier: readSubscriptionTier(cs.service),
    paymentFailedAt: cs.paymentFailedAt,
    canceledAt: cs.canceledAt,
    period,
    renews:
      tracksUsage &&
      (subscription
        ? !subscription.cancel_at_period_end && subscription.status !== "canceled"
        : true),
    cap,
    usage,
  };
}

export async function getMySubscriptions(
  organizationId: string
): Promise<MySubscription[]> {
  const clientServices = await db.clientService.findMany({
    where: { organizationId, service: { monthlyPriceCents: { not: null } } },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  const subscriptions = await fetchSubscriptions(
    clientServices
      .map((cs) => cs.stripeSubscriptionId)
      .filter((id): id is string => id !== null)
  );
  const fallback = calendarMonth();

  return Promise.all(
    clientServices.map((cs) => toMySubscription(cs, subscriptions, fallback))
  );
}

export async function getSubscriptionFor(
  clientServiceId: string
): Promise<MySubscription | null> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    include: { service: true },
  });
  if (!clientService || clientService.service.monthlyPriceCents === null) return null;

  const subscriptions = await fetchSubscriptions(
    clientService.stripeSubscriptionId ? [clientService.stripeSubscriptionId] : []
  );
  return toMySubscription(clientService, subscriptions, calendarMonth());
}

export function isRunning(subscription: MySubscription): boolean {
  return subscription.status === "ACTIVE" || subscription.status === "CONFIGURING";
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

export function describePeriod(subscription: MySubscription): string {
  const { start, end } = subscription.period;
  if (!end) return `Depuis le ${formatShortDate(start)}`;
  return `Période du ${formatShortDate(start)} au ${formatShortDate(end)}`;
}

export function describeNextCharge(subscription: MySubscription): string {
  if (subscription.status === "CANCELED") {
    return subscription.canceledAt
      ? `Résilié le ${formatDate(subscription.canceledAt)} , plus aucun prélèvement`
      : "Résilié, plus aucun prélèvement";
  }
  if (subscription.status === "PENDING_PAYMENT") {
    return "Aucun prélèvement tant que le premier paiement n'est pas réglé";
  }
  if (!subscription.renews) {
    return subscription.period.end
      ? `Ne sera pas renouvelé après le ${formatDate(subscription.period.end)}`
      : "Ne sera pas renouvelé";
  }
  const amount = formatCentsWithVat(subscription.monthlyPriceCents);
  return subscription.period.end
    ? `Prochain prélèvement : ${amount} le ${formatDate(subscription.period.end)}`
    : `Prochain prélèvement : ${amount}`;
}

export function monthlyTotalCents(subscriptions: MySubscription[]): number {
  return subscriptions
    .filter(isRunning)
    .reduce((sum, subscription) => sum + subscription.monthlyPriceCents, 0);
}

export function nextRenewal(subscriptions: MySubscription[]): Date | null {
  const dates = subscriptions
    .filter((subscription) => isRunning(subscription) && subscription.renews)
    .map((subscription) => subscription.period.end)
    .filter((end): end is Date => end !== null);
  return dates.length > 0
    ? new Date(Math.min(...dates.map((date) => date.getTime())))
    : null;
}
