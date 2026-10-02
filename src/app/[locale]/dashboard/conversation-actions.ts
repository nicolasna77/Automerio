"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionError, runAction } from "@/lib/run-action";
import { getConversations, replyWindowClosesAt, type ConversationView } from "@/lib/conversations";
import { MAX_REPLY_LENGTH } from "@/lib/conversation-limits";
import { parisDayRange } from "@/lib/paris-day";
import { sendToContact } from "@/lib/conversation-send";

// Chaque action vérifie elle-même la session et l'appartenance de la
// conversation à une organisation du client, et renvoie la liste à jour,
// filtrée sur le jour affiché (AAAA-MM-JJ) s'il y en a un.
function refreshedList(clientServiceId: string, day: string | null) {
  return getConversations(clientServiceId, day ? parisDayRange(day) : null);
}

async function requireConversation(conversationId: string) {
  const session = await getSession();
  if (!session) throw new ActionError("Votre session a expiré. Reconnectez-vous.");

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      clientService: {
        select: {
          id: true,
          organizationId: true,
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          facebookPageId: true,
          facebookPageAccessToken: true,
          instagramAccountId: true,
        },
      },
    },
  });
  if (!conversation || !canReadClientService(conversation.clientService, await viewerOf(session.user.id))) {
    throw new ActionError("Cette conversation est introuvable.");
  }
  return { conversation, userId: session.user.id };
}

export async function takeOverConversation(conversationId: string, day: string | null = null) {
  return runAction<ConversationView[]>(async () => {
    const { conversation } = await requireConversation(conversationId);
    if (!conversation.humanTakeoverAt) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { humanTakeoverAt: new Date() },
      });
    }
    return refreshedList(conversation.clientServiceId, day);
  });
}

export async function handBackConversation(conversationId: string, day: string | null = null) {
  return runAction<ConversationView[]>(async () => {
    const { conversation } = await requireConversation(conversationId);
    await db.conversation.update({
      where: { id: conversationId },
      data: { humanTakeoverAt: null },
    });
    return refreshedList(conversation.clientServiceId, day);
  });
}

export async function sendConversationReply(
  conversationId: string,
  rawText: string,
  day: string | null = null
) {
  return runAction<ConversationView[]>(async () => {
    const text = rawText.trim();
    if (!text) throw new ActionError("Écrivez un message avant d'envoyer.");
    if (text.length > MAX_REPLY_LENGTH) {
      throw new ActionError(`Votre message dépasse ${MAX_REPLY_LENGTH} caractères.`);
    }

    const { conversation, userId } = await requireConversation(conversationId);
    if (!(await checkRateLimit("conversation-reply", userId, "1 m", 20))) {
      throw new ActionError("Trop de messages envoyés. Patientez une minute.");
    }
    const closesAt = replyWindowClosesAt(conversation.lastInboundAt);
    if (!closesAt || closesAt.getTime() < Date.now()) {
      throw new ActionError(
        "Ce contact ne vous a pas écrit depuis plus de 24 heures. Il doit vous recontacter avant que vous puissiez répondre."
      );
    }

    // Le message est enregistré avant l'envoi : si l'écriture échouait après
    // un envoi réussi, le client réessaierait et le contact le recevrait deux
    // fois. Répondre soi-même vaut reprise de main : l'assistant ne doit pas
    // contredire la réponse au message suivant.
    const now = new Date();
    const [message] = await db.$transaction([
      db.conversationMessage.create({
        data: { conversationId, direction: "OUTBOUND", text, sentById: userId, createdAt: now },
        select: { id: true },
      }),
      db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now, humanTakeoverAt: conversation.humanTakeoverAt ?? now },
      }),
    ]);

    let failure: ActionError | null = null;
    try {
      const sent = await sendToContact(
        conversation.clientService,
        conversation.channel,
        conversation.contactId,
        text
      );
      if (!sent) {
        failure = new ActionError("Le compte n'est plus connecté. Reconnectez-le depuis l'onglet Connecteurs.");
      }
    } catch (err) {
      console.error(`[conversations] échec d'envoi dans ${conversationId} :`, err);
      failure = new ActionError("Le message n'a pas pu être envoyé. Réessayez dans un instant.");
    }
    if (failure) {
      // Rien n'est parti : le message ne doit pas rester dans l'historique.
      await db.conversationMessage.delete({ where: { id: message.id } }).catch((err) =>
        console.error(`[conversations] message non envoyé ${message.id} non supprimé :`, err)
      );
      throw failure;
    }
    return refreshedList(conversation.clientServiceId, day);
  });
}
