import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { claimInboundMessage, recordReply } from "@/lib/conversations";
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

  // Meta renvoie un webhook mal acquitte, souvent pendant que la premiere
  // reponse se redige : le message est inscrit avant d'y repondre, et un
  // message deja inscrit ne recoit pas une seconde reponse. Si l'inscription
  // echoue, l'assistant repond quand meme, sans historique.
  const conversationId = await claimInboundMessage({
    clientServiceId: clientService.id,
    channel: "INSTAGRAM",
    contactId: senderId,
    text: message.text,
    externalId: message.mid,
  }).catch((err) => {
    console.error(`[instagram] échec d'enregistrement de la conversation ${message.mid} :`, err);
    return undefined;
  });
  if (conversationId === null) {
    return NextResponse.json({ received: true });
  }

  // La reponse n'entre dans l'historique qu'une fois reellement envoyee.
  let sentReply: string | null = null;
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

  if (sentReply && conversationId) {
    await recordReply(conversationId, sentReply).catch((err) =>
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
