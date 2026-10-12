import { NextResponse, after } from "next/server";
import { getValidInstagramToken, sendInstagramMessage, sendInstagramPrivateReply } from "@/lib/instagram";
import { db } from "@/lib/db";
import {
  commentRepliesEnabled,
  parseInstagramComments,
  repliesToComments,
  type InstagramCommentPayload,
} from "@/lib/instagram-comments";
import { validateInstagramSignature, verifyMetaWebhookChallenge } from "@/lib/meta";
import { parseWebhookBody, processInboundBatch, type PendingInboundMessage } from "@/lib/inbound-message-guard";

// Les réponses (OpenAI, envoi Meta) partent après l'accusé de réception.
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyMetaWebhookChallenge(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type InstagramWebhookPayload = InstagramCommentPayload & {
  entry?: {
    id?: string;
    messaging?: {
      sender?: { id?: string };
      recipient?: { id?: string };
      message?: { mid: string; text?: string; is_echo?: boolean };
    }[];
  }[];
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateInstagramSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = parseWebhookBody<InstagramWebhookPayload>(rawBody);
  if (!payload) return new NextResponse("Bad Request", { status: 400 });

  // Meta peut regrouper plusieurs comptes et plusieurs messages dans un envoi.
  // Accusé de réception immédiat : Meta relivre l'envoi si la réponse tarde, et
  // claimInboundMessage écarte les doublons par l'identifiant du message.
  const messages: PendingInboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const igUserId = event.recipient?.id;
      const senderId = event.sender?.id;
      const message = event.message;
      if (!igUserId || !senderId || !message?.mid || !message.text || message.is_echo) continue;
      messages.push({ accountId: igUserId, contactId: senderId, text: message.text, externalId: message.mid });
    }
  }

  after(() =>
    processInboundBatch({
      channel: "INSTAGRAM",
      usageType: "instagram_message",
      messages,
      send: async (clientService, message, replyText) => {
        const accessToken = await getValidInstagramToken(clientService.id);
        if (!accessToken) return false;
        await sendInstagramMessage(message.accountId, message.contactId, replyText, accessToken);
        return true;
      },
    })
  );

  // Commentaires sur les publications : réponse en message privé, seulement
  // si la fonction est ouverte (permission Meta accordée) et activée sur la
  // solution du compte concerné.
  const comments = commentRepliesEnabled() ? parseInstagramComments(payload) : [];
  if (comments.length > 0) {
    after(async () => {
      const accounts = await db.clientService.findMany({
        where: { instagramAccountId: { in: [...new Set(comments.map((comment) => comment.accountId))] } },
        select: { instagramAccountId: true, configuration: true },
      });
      const enabled = new Set(
        accounts
          .filter((account) => repliesToComments((account.configuration ?? {}) as Record<string, unknown>))
          .map((account) => account.instagramAccountId)
      );
      await processInboundBatch({
        channel: "INSTAGRAM",
        usageType: "instagram_message",
        messages: comments.filter((comment) => enabled.has(comment.accountId)),
        send: async (clientService, comment, replyText) => {
          const accessToken = await getValidInstagramToken(clientService.id);
          if (!accessToken) return false;
          await sendInstagramPrivateReply(comment.accountId, comment.externalId, replyText, accessToken);
          return true;
        },
      });
    });
  }

  return NextResponse.json({ received: true });
}
