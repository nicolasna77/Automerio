import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { getIncludedVatRateId } from "@/lib/stripe-billing";
import { logServiceEvent } from "@/lib/service-events";
import { sendQuotaAlertEmail } from "@/lib/email/notifications";
import {
  calendarMonth,
  consumedUnits,
  periodOf,
  type BillingPeriod,
} from "@/lib/subscriptions";
import {
  formatUsageUnits,
  overageCents,
  overageUnits,
  readClientUsageCap,
  type UsageCap,
} from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";
import { QUOTA_WARNING_RATIO } from "@/lib/quota";


export type QuotaAlert = "WARNING" | "EXCEEDED";

export function quotaThresholdCrossed(before: number, after: number, included: number): QuotaAlert | null {
  if (included <= 0 || after <= before) return null;
  if (before < included && after >= included) return "EXCEEDED";
  const warning = included * QUOTA_WARNING_RATIO;
  if (before < warning && after >= warning) return "WARNING";
  return null;
}

export function overageLineDescription(units: number, cap: UsageCap, serviceName: string): string {
  return `${serviceName} : ${formatUsageUnits(units, cap.unit)} au-delà du forfait (${formatCentsWithVat(cap.overageUnitPriceCents)} l'unité)`;
}

function periodFromInvoice(invoice: Stripe.Invoice): BillingPeriod {
  return { start: new Date(invoice.period_start * 1000), end: new Date(invoice.period_end * 1000) };
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

export async function billOverageOnInvoice(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason !== "subscription_cycle" || invoice.status !== "draft") return;
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  const customerId = idOf(invoice.customer);
  if (!subscriptionId || !customerId || !invoice.id) return;

  const overage = await overageFor(subscriptionId, periodFromInvoice(invoice));
  if (!overage) return;

  await stripeClient.invoiceItems.create(
    { ...(await overageLine(overage)), customer: customerId, invoice: invoice.id },
    { idempotencyKey: `overage-${invoice.id}-${overage.clientServiceId}` }
  );
}

export async function billFinalOverage(subscription: Stripe.Subscription): Promise<void> {
  const customerId = idOf(subscription.customer);
  const period = periodOf(subscription);
  if (!customerId || !period) return;

  const end = subscription.ended_at ? new Date(subscription.ended_at * 1000) : period.end;
  const overage = await overageFor(subscription.id, { start: period.start, end });
  if (!overage) return;

  const invoice = await stripeClient.invoices.create(
    {
      customer: customerId,
      collection_method: "charge_automatically",
      auto_advance: true,
      pending_invoice_items_behavior: "exclude",
      default_payment_method: idOf(subscription.default_payment_method) ?? undefined,
      description: `Dépassement de la dernière période : ${overage.serviceName}`,
      metadata: { clientServiceId: overage.clientServiceId, reason: "final_overage" },
    },
    { idempotencyKey: `final-overage-invoice-${subscription.id}` }
  );
  if (!invoice.id) return;

  await stripeClient.invoiceItems.create(
    { ...(await overageLine(overage)), customer: customerId, invoice: invoice.id },
    { idempotencyKey: `final-overage-${subscription.id}` }
  );
}

type Overage = {
  clientServiceId: string;
  serviceName: string;
  cap: UsageCap;
  extra: number;
  amount: number;
};

async function overageFor(subscriptionId: string, period: BillingPeriod): Promise<Overage | null> {
  const clientService = await db.clientService.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { service: true },
  });
  if (!clientService) return null;

  const cap = readClientUsageCap(clientService, clientService.service);
  if (!cap || cap.overageUnitPriceCents <= 0) return null;

  const units = await consumedUnits(clientService.id, cap, period);
  const extra = overageUnits(units, cap);
  const amount = overageCents(units, cap);
  if (extra <= 0 || amount <= 0) return null;

  return { clientServiceId: clientService.id, serviceName: clientService.name, cap, extra, amount };
}

async function overageLine(overage: Overage) {
  return {
    currency: "eur",
    amount: overage.amount,
    tax_rates: [await getIncludedVatRateId()],
    description: overageLineDescription(overage.extra, overage.cap, overage.serviceName),
    metadata: { clientServiceId: overage.clientServiceId, overageUnits: String(overage.extra) },
  };
}

async function currentPeriod(stripeSubscriptionId: string | null): Promise<BillingPeriod> {
  if (!stripeSubscriptionId) return calendarMonth();
  try {
    const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
    return periodOf(subscription) ?? calendarMonth();
  } catch (err) {
    console.error("[quota] période Stripe illisible, repli sur le mois calendaire :", err);
    return calendarMonth();
  }
}

export async function checkQuotaAlerts(
  clientServiceId: string,
  lastCall: { durationSec: number | null }
): Promise<void> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    include: { service: true },
  });
  if (!clientService || clientService.status !== "ACTIVE") return;

  const cap = readClientUsageCap(clientService, clientService.service);
  if (!cap) return;

  const period = await currentPeriod(clientService.stripeSubscriptionId);
  const after = await consumedUnits(clientServiceId, cap, period);
  const justConsumed = cap.unit === "CALL" ? 1 : Math.ceil((lastCall.durationSec ?? 0) / 60);
  if (justConsumed <= 0) return;
  const alert = quotaThresholdCrossed(Math.max(0, after - justConsumed), after, cap.includedUnits);
  if (!alert) return;

  const type = alert === "EXCEEDED" ? "QUOTA_EXCEEDED" : "QUOTA_WARNING";
  const alreadySent = await db.serviceEvent.count({
    where: { clientServiceId, type, createdAt: { gte: period.start } },
  });
  if (alreadySent > 0) return;

  await logServiceEvent(clientServiceId, type, `${formatUsageUnits(after, cap.unit)} sur ${formatUsageUnits(cap.includedUnits, cap.unit)}`);

  const members = await db.member.findMany({
    where: { organizationId: clientService.organizationId },
    select: { user: { select: { email: true, name: true, notificationPreferences: true } } },
  });
  await Promise.allSettled(
    members.map(({ user }) =>
      sendQuotaAlertEmail(user, {
        alert,
        serviceName: clientService.name,
        clientServiceId,
        consumed: formatUsageUnits(after, cap.unit),
        included: formatUsageUnits(cap.includedUnits, cap.unit),
        overagePrice: cap.overageUnitPriceCents > 0 ? formatCentsWithVat(cap.overageUnitPriceCents) : null,
      })
    )
  );
}
