import type { ClientServiceStatus, MessagingChannel, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { claimInboundMessage, recordReply } from "@/lib/conversations";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumedUnits, storedPeriod } from "@/lib/subscriptions";
import { pausesAtLimit, readClientUsageCap, type UsageCap, type UsageUnit } from "@/lib/usage-cap";

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

export type ReplyRefusal = "paused" | "sender_rate_limited" | "service_daily_cap" | "quota_exhausted";
export type ReplyDecision = { allowed: true } | { allowed: false; reason: ReplyRefusal };

// Même règle que la voix et la facturation (pausesAtLimit, usage-cap.ts) :
// dépassement refusé, ou sans prix, l'assistant s'arrête au forfait.
export function isQuotaExhausted(cap: UsageCap | null, consumed: number, overageAllowed = true): boolean {
  if (!cap || !pausesAtLimit(cap, overageAllowed)) return false;
  return consumed >= cap.includedUnits;
}

type QuotaColumns = {
  id: string;
  overageAllowed: boolean;
  pausedAt: Date | null;
  stripeSubscriptionId: string | null;
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
  if (!cap || !pausesAtLimit(cap, clientService.overageAllowed)) return false;
  // Période de facturation lue en base, comme la voix et le tableau de bord.
  const period = await storedPeriod(clientService.stripeSubscriptionId);
  return isQuotaExhausted(cap, await consumedUnits(clientService.id, cap, period), clientService.overageAllowed);
}

export async function decideAiReply(clientService: QuotaColumns, contactId: string): Promise<ReplyDecision> {
  // Mise en pause par le client : rien à compter, l'assistant se tait.
  if (clientService.pausedAt) return { allowed: false, reason: "paused" };

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

// Message extrait d'un webhook Meta, avant toute requête en base.
export type PendingInboundMessage = {
  // Compte Meta destinataire : numéro WhatsApp, page Facebook ou compte Instagram.
  accountId: string;
  contactId: string;
  text: string;
  externalId: string;
};

// Regroupe les messages par conversation (compte destinataire + expéditeur), en
// gardant l'ordre de réception dans chaque groupe et l'ordre de première
// apparition entre groupes. Un compte correspond à une seule prestation.
export function groupByConversation<T extends Pick<PendingInboundMessage, "accountId" | "contactId">>(
  messages: readonly T[]
): T[][] {
  const groups = new Map<string, T[]>();
  for (const message of messages) {
    const key = JSON.stringify([message.accountId, message.contactId]);
    const group = groups.get(key);
    if (group) group.push(message);
    else groups.set(key, [message]);
  }
  return [...groups.values()];
}

export type InboundBatch = {
  channel: MessagingChannel;
  usageType: string;
  messages: readonly PendingInboundMessage[];
  send: (clientService: LiveClientService, message: PendingInboundMessage, replyText: string) => Promise<boolean>;
};

// Traite un envoi de Meta après la réponse 200 (after()) : les conversations
// avancent en parallèle, les messages d'une même conversation un par un pour
// garder l'ordre des réponses. Ne lève jamais : les erreurs sont journalisées.
export async function processInboundBatch(batch: InboundBatch): Promise<void> {
  const { channel, usageType, messages, send } = batch;
  if (messages.length === 0) return;
  const log = `[${channel.toLowerCase()}]`;

  const accountIds = [...new Set(messages.map((m) => m.accountId))];
  const services = new Map<string, LiveClientService | null>(
    await Promise.all(
      accountIds.map(async (accountId) => {
        const service = await findLiveClientService(channel, accountId).catch((err) => {
          console.error(`${log} échec de recherche de la prestation du compte ${accountId} :`, err);
          return null;
        });
        return [accountId, service] as const;
      })
    )
  );

  const results = await Promise.allSettled(
    groupByConversation(messages).map(async (group) => {
      for (const message of group) {
        const clientService = services.get(message.accountId);
        if (!clientService) continue;
        try {
          await handleInboundMessage({
            clientService,
            channel,
            contactId: message.contactId,
            text: message.text,
            externalId: message.externalId,
            usageType,
            send: (replyText) => send(clientService, message, replyText),
          });
        } catch (err) {
          console.error(`${log} échec de traitement du message ${message.externalId} :`, err);
        }
      }
    })
  );
  for (const result of results) {
    if (result.status === "rejected") console.error(`${log} échec de traitement d'une conversation :`, result.reason);
  }
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
