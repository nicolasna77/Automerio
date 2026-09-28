import { Prisma, type MessagingChannel } from "@prisma/client";
import { db } from "@/lib/db";

export async function claimInboundMessage(input: {
  clientServiceId: string;
  channel: MessagingChannel;
  contactId: string;
  text: string;
  externalId: string;
}): Promise<string | null> {
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
        },
        update: { lastMessageAt: now },
        select: { id: true },
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
      return conversation.id;
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
  await db.$transaction([
    db.conversationMessage.create({
      data: { conversationId, direction: "OUTBOUND", text, createdAt: now },
    }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
  ]);
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

const CONVERSATION_LIMIT = 20;
const MESSAGES_PER_CONVERSATION = 50;

export type ConversationView = {
  id: string;
  contact: string;
  lastMessageAt: Date;
  messageCount: number;
  messages: { id: string; direction: "INBOUND" | "OUTBOUND"; text: string; createdAt: Date }[];
};

export async function getConversations(clientServiceId: string): Promise<ConversationView[]> {
  const conversations = await db.conversation.findMany({
    where: { clientServiceId },
    orderBy: { lastMessageAt: "desc" },
    take: CONVERSATION_LIMIT,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: MESSAGES_PER_CONVERSATION,
        select: { id: true, direction: true, text: true, createdAt: true },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    contact: contactLabel(conversation.channel, conversation.contactId),
    lastMessageAt: conversation.lastMessageAt,
    messageCount: conversation._count.messages,
    messages: [...conversation.messages].reverse(),
  }));
}
