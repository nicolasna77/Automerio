import { Prisma, type MessagingChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { checkQuotaAlerts } from "@/lib/overage-billing";
import {
  CONVERSATION_LIMIT,
  FILTERED_CONVERSATION_LIMIT,
  REPLY_WINDOW_MS,
} from "@/lib/conversation-limits";

export type ClaimedConversation = { id: string; humanTakeover: boolean };

// Enregistre un message reçu. Renvoie null si Meta le livre une seconde fois ;
// `humanTakeover` indique que le client a repris la main : l'assistant se tait.
export async function claimInboundMessage(input: {
  clientServiceId: string;
  channel: MessagingChannel;
  contactId: string;
  text: string;
  externalId: string;
}): Promise<ClaimedConversation | null> {
  const now = new Date();
  try {
    return await db.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: {
          clientServiceId_channel_contactId: {
            clientServiceId: input.clientServiceId,
            channel: input.channel,
            contactId: input.contactId,
          },
        },
        create: {
          clientServiceId: input.clientServiceId,
          channel: input.channel,
          contactId: input.contactId,
          lastMessageAt: now,
          lastInboundAt: now,
        },
        update: { lastMessageAt: now, lastInboundAt: now },
        select: { id: true, humanTakeoverAt: true },
      });

      await tx.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: "INBOUND",
          text: input.text,
          externalId: input.externalId,
          createdAt: now,
        },
      });
      return { id: conversation.id, humanTakeover: conversation.humanTakeoverAt !== null };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await db.conversationMessage.findUnique({
        where: { externalId: input.externalId },
        select: { id: true },
      });
      if (existing) return null;
    }
    throw err;
  }
}

export async function recordReply(conversationId: string, text: string): Promise<void> {
  const now = new Date();
  const [, conversation] = await db.$transaction([
    db.conversationMessage.create({
      data: { conversationId, direction: "OUTBOUND", text, createdAt: now },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
      select: { clientServiceId: true },
    }),
  ]);
  await checkQuotaAlerts(conversation.clientServiceId, () => 1).catch((err) =>
    console.error("[quota] alerte de messagerie non vérifiée :", err)
  );
}

export function contactLabel(channel: MessagingChannel, contactId: string): string {
  if (channel === "WHATSAPP") {
    const digits = contactId.replace(/\D/g, "");
    return digits.startsWith("33") && digits.length === 11
      ? `0${digits.slice(2)}`.replace(/(\d{2})(?=\d)/g, "$1 ")
      : `+${digits}`;
  }
  return `Contact ·${contactId.slice(-4)}`;
}

export function replyWindowClosesAt(lastInboundAt: Date | null): Date | null {
  return lastInboundAt ? new Date(lastInboundAt.getTime() + REPLY_WINDOW_MS) : null;
}

const MESSAGES_PER_CONVERSATION = 50;

export type MessageAuthor = "CONTACT" | "ASSISTANT" | "HUMAN";

// Dates en chaînes ISO : la même forme sert au rendu serveur et au polling.
export type ConversationView = {
  id: string;
  contact: string;
  channel: MessagingChannel;
  lastMessageAt: string;
  replyWindowClosesAt: string | null;
  humanTakeover: boolean;
  messageCount: number;
  messages: { id: string; author: MessageAuthor; authorName: string | null; text: string; createdAt: string }[];
};

// Avec un jour (bornes de parisDayRange) : les conversations qui ont reçu ou
// envoyé au moins un message ce jour-là, avec tout leur fil.
export async function getConversations(
  clientServiceId: string,
  day?: { gte: Date; lt: Date } | null
): Promise<ConversationView[]> {
  const conversations = await db.conversation.findMany({
    where: { clientServiceId, ...(day && { messages: { some: { createdAt: day } } }) },
    orderBy: { lastMessageAt: "desc" },
    take: day ? FILTERED_CONVERSATION_LIMIT : CONVERSATION_LIMIT,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: MESSAGES_PER_CONVERSATION,
        select: {
          id: true,
          direction: true,
          text: true,
          createdAt: true,
          sentById: true,
          sentBy: { select: { name: true } },
        },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    contact: contactLabel(conversation.channel, conversation.contactId),
    channel: conversation.channel,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    replyWindowClosesAt: replyWindowClosesAt(conversation.lastInboundAt)?.toISOString() ?? null,
    humanTakeover: conversation.humanTakeoverAt !== null,
    messageCount: conversation._count.messages,
    messages: [...conversation.messages].reverse().map((message) => ({
      id: message.id,
      author:
        message.direction === "INBOUND" ? "CONTACT" : message.sentById ? "HUMAN" : "ASSISTANT",
      authorName: message.sentBy?.name ?? null,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    })),
  }));
}

// Jours proposés dans le filtre : les 60 derniers.
const DAYS_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export type ConversationDay = { day: string; count: number };

// Jours (heure de Paris) qui ont eu des échanges, du plus récent au plus
// ancien, avec le nombre de conversations actives ce jour-là. Regroupé par la
// base : appelé à chaque passage du polling. Les dates sont stockées en UTC
// sans fuseau, d'où la double conversion.
export async function getConversationDays(clientServiceId: string): Promise<ConversationDay[]> {
  const since = new Date(Date.now() - DAYS_WINDOW_MS);
  return db.$queryRaw<ConversationDay[]>`
    SELECT to_char((m."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS day,
           COUNT(DISTINCT m."conversationId")::int AS count
    FROM "conversation_message" m
    JOIN "conversation" c ON c."id" = m."conversationId"
    WHERE c."clientServiceId" = ${clientServiceId} AND m."createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 DESC
  `;
}
