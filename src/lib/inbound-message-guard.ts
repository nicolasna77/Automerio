import type { ClientServiceStatus, MessagingChannel, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { claimInboundMessage, recordReply } from "@/lib/conversations";
import { checkRateLimit } from "@/lib/rate-limit";
import { calendarMonth, consumedUnits } from "@/lib/subscriptions";
import { readClientUsageCap, type UsageCap, type UsageUnit } from "@/lib/usage-cap";

// Messages entrants WhatsApp, Messenger et Instagram : chaque réponse coûte un
// appel OpenAI et un envoi Meta à la plateforme. Ce module décide si
// l'assistant répond, et orchestre l'enregistrement et la réponse.

// Payée (CONFIGURING : le client teste sa messagerie avant la mise en service)
// ou en service. Un paiement en échec (paymentFailedAt) laisse la période de
// grâce annoncée au client ; PENDING_PAYMENT et CANCELED ne répondent pas.
export const LIVE_STATUSES = ["CONFIGURING", "ACTIVE"] as const satisfies readonly ClientServiceStatus[];

export function isLiveStatus(status: ClientServiceStatus): boolean {
  return (LIVE_STATUSES as readonly ClientServiceStatus[]).includes(status);
}

// Un même expéditeur : 20 messages par tranche de 10 minutes.
export const SENDER_LIMIT = { window: "10 m", max: 20 } as const;
// Une même prestation : 500 réponses de l'assistant par 24 heures glissantes.
export const SERVICE_DAILY_LIMIT = { window: "24 h", max: 500 } as const;

export type ReplyRefusal = "sender_rate_limited" | "service_daily_cap" | "quota_exhausted";
export type ReplyDecision = { allowed: true } | { allowed: false; reason: ReplyRefusal };

// Même règle que la facturation (src/lib/overage-billing.ts, overageFor) : au-delà
// du forfait, le dépassement est facturé ; sans prix de dépassement, il ne peut
// pas l'être, l'assistant s'arrête donc au forfait.
export function isQuotaExhausted(cap: UsageCap | null, consumed: number): boolean {
  if (!cap || cap.overageUnitPriceCents > 0) return false;
  return consumed >= cap.includedUnits;
}

type QuotaColumns = {
  id: string;
  includedUsageUnits: number | null;
  service: {
    includedUsageUnits: number | null;
    usageUnit: UsageUnit | null;
    overageUnitPriceCents: number | null;
  };
};

async function quotaExhausted(clientService: QuotaColumns): Promise<boolean> {
  const cap = readClientUsageCap(clientService, clientService.service);
  // Ne compte en base que si le forfait peut bloquer.
  if (!cap || cap.overageUnitPriceCents > 0) return false;
  // Mois calendaire : évite un appel Stripe par message reçu.
  return isQuotaExhausted(cap, await consumedUnits(clientService.id, cap, calendarMonth()));
}

export async function decideAiReply(clientService: QuotaColumns, contactId: string): Promise<ReplyDecision> {
  const senderAllowed = await checkRateLimit(
    "inbound-message-sender",
    `${clientService.id}:${contactId}`,
    SENDER_LIMIT.window,
    SENDER_LIMIT.max
  );
  if (!senderAllowed) return { allowed: false, reason: "sender_rate_limited" };

  const serviceAllowed = await checkRateLimit(
    "inbound-message-service",
    clientService.id,
    SERVICE_DAILY_LIMIT.window,
    SERVICE_DAILY_LIMIT.max
  );
  if (!serviceAllowed) return { allowed: false, reason: "service_daily_cap" };

  if (await quotaExhausted(clientService)) return { allowed: false, reason: "quota_exhausted" };
  return { allowed: true };
}

function accountWhere(channel: MessagingChannel, accountId: string): Prisma.ClientServiceWhereInput {
  if (channel === "WHATSAPP") return { whatsappPhoneNumberId: accountId };
  if (channel === "MESSENGER") return { facebookPageId: accountId };
  return { instagramAccountId: accountId };
}

// Seules les prestations en service sont trouvées : une prestation résiliée ou
// impayée n'enregistre rien et ne répond pas.
export async function findLiveClientService(channel: MessagingChannel, accountId: string) {
  return db.clientService.findFirst({
    where: { ...accountWhere(channel, accountId), status: { in: [...LIVE_STATUSES] } },
    include: { service: true, organization: true },
  });
}

export type LiveClientService = NonNullable<Awaited<ReturnType<typeof findLiveClientService>>>;

export type InboundMessage = {
  clientService: LiveClientService & Parameters<typeof generateMessagingReply>[0];
  channel: MessagingChannel;
  contactId: string;
  text: string;
  externalId: string;
  usageType: string;
  // Envoie la réponse ; renvoie false si elle n'a pas pu partir (jeton absent…).
  send: (replyText: string) => Promise<boolean>;
};

export async function handleInboundMessage(input: InboundMessage): Promise<void> {
  const { clientService, channel, contactId, text, externalId } = input;
  const log = `[${channel.toLowerCase()}]`;

  const conversation = await claimInboundMessage({
    clientServiceId: clientService.id,
    channel,
    contactId,
    text,
    externalId,
  }).catch((err) => {
    console.error(`${log} échec d'enregistrement de la conversation ${externalId} :`, err);
    return undefined;
  });
  // Déjà reçu : Meta relivre le même message.
  if (conversation === null) return;

  let sentReply: string | null = null;
  // Le client a repris la main : le message est enregistré, l'assistant se tait.
  if (!conversation?.humanTakeover) {
    try {
      const decision = await decideAiReply(clientService, contactId);
      if (!decision.allowed) {
        console.warn(`${log} pas de réponse au message ${externalId} (${decision.reason}) pour ${clientService.id}.`);
      } else {
        const replyText = await generateMessagingReply(clientService, text);
        if (replyText && (await input.send(replyText))) sentReply = replyText;
      }
    } catch (err) {
      console.error(`${log} échec de réponse au message ${externalId} :`, err);
    }
  }

  if (sentReply && conversation) {
    await recordReply(conversation.id, sentReply).catch((err) =>
      console.error(`${log} échec d'enregistrement de la réponse à ${externalId} :`, err)
    );
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: input.usageType,
    externalId,
    metadata: { from: contactId },
  }).catch((err) => console.error(`${log} échec d'enregistrement du message ${externalId} :`, err));
}

// Corps JSON d'un webhook Meta ; null s'il est illisible (réponse 400).
export function parseWebhookBody<T>(rawBody: string): T | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}
