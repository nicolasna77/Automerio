import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessagingReply } from "@/lib/messaging-agent";
import { recordUsageEvent } from "@/lib/usage-events";
import { claimInboundMessage, recordReply } from "@/lib/conversations";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
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

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }[];
      };
    }[];
  }[];
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateMetaSignature(signature, rawBody)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;
  const message = value?.messages?.[0];

  if (!phoneNumberId || !message || message.type !== "text" || !message.text) {
    return NextResponse.json({ received: true });
  }

  const clientService = await db.clientService.findFirst({
    where: { whatsappPhoneNumberId: phoneNumberId },
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
    channel: "WHATSAPP",
    contactId: message.from,
    text: message.text.body,
    externalId: message.id,
  }).catch((err) => {
    console.error(`[whatsapp] échec d'enregistrement de la conversation ${message.id} :`, err);
    return undefined;
  });
  if (conversationId === null) {
    return NextResponse.json({ received: true });
  }

  // La reponse n'entre dans l'historique qu'une fois reellement envoyee.
  let sentReply: string | null = null;
  try {
    const replyText = await generateMessagingReply(clientService, message.text.body);
    if (replyText) {
      await sendWhatsAppMessage(
        phoneNumberId,
        message.from,
        replyText,
        clientService.whatsappAccessToken
      );
      sentReply = replyText;
    }
  } catch (err) {
    console.error(`[whatsapp] échec de réponse au message ${message.id} :`, err);
  }

  if (sentReply && conversationId) {
    await recordReply(conversationId, sentReply).catch((err) =>
      console.error(`[whatsapp] échec d'enregistrement de la réponse à ${message.id} :`, err)
    );
  }

  await recordUsageEvent({
    clientServiceId: clientService.id,
    type: "whatsapp_message",
    externalId: message.id,
    metadata: { from: message.from },
  }).catch((err) => console.error(`[whatsapp] échec d'enregistrement du message ${message.id} :`, err));

  return NextResponse.json({ received: true });
}
