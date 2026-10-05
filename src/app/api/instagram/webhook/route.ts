import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { claimInboundMessage, recordReply } from "@/lib/conversations";
import { isPausedByQuota } from "@/lib/overage-billing";
import { getValidInstagramToken, sendInstagramMessage } from "@/lib/instagram";
import { validateMetaSignature, verifyMetaWebhookChallenge } from "@/lib/meta";

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

type InstagramWebhookPayload = {
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

  if (!validateMetaSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  const event = payload.entry?.[0]?.messaging?.[0];
  const igUserId = event?.recipient?.id;
  const senderId = event?.sender?.id;
  const message = event?.message;

  if (!igUserId || !senderId || !message?.text || message.is_echo) {
    return NextResponse.json({ received: true });
  }

  const clientService = await db.clientService.findFirst({
    where: { instagramAccountId: igUserId },
    include: { service: true, organization: true },
  });
  if (!clientService) {
    return NextResponse.json({ received: true });
  }

  const conversation = await claimInboundMessage({
    clientServiceId: clientService.id,
    channel: "INSTAGRAM",
    contactId: senderId,
    text: message.text,
    externalId: message.mid,
  }).catch((err) => {
    console.error(`[instagram] échec d'enregistrement de la conversation ${message.mid} :`, err);
    return undefined;
  });
  if (conversation === null) {
    return NextResponse.json({ received: true });
  }

  let sentReply: string | null = null;
  // Dépassement refusé et forfait atteint : l'assistant se tait aussi.
  const paused = await isPausedByQuota(clientService).catch((err) => {
    console.error(`[instagram] lecture du quota impossible :`, err);
    return false;
  });
  // Le client a repris la main : le message est enregistré, l'assistant se tait.
  if (!conversation?.humanTakeover && !paused) {
    try {
      const replyText = await generateMessagingReply(clientService, message.text);
      if (replyText) {
        const accessToken = await getValidInstagramToken(clientService.id);
        if (accessToken) {
          await sendInstagramMessage(igUserId, senderId, replyText, accessToken);
          sentReply = replyText;
        }
      }
    } catch (err) {
      console.error(`[instagram] échec de réponse au message ${message.mid} :`, err);
    }
  }

  if (sentReply && conversation) {
    await recordReply(conversation.id, sentReply).catch((err) =>
      console.error(`[instagram] échec d'enregistrement de la réponse à ${message.mid} :`, err)
    );
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: "instagram_message",
    externalId: message.mid,
    metadata: { from: senderId },
  }).catch((err) => console.error(`[instagram] échec d'enregistrement du message ${message.mid} :`, err));

  return NextResponse.json({ received: true });
}
