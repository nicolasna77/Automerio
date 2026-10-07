import { NextResponse, after } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { validateMetaSignature, verifyMetaWebhookChallenge } from "@/lib/meta";
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

  const payload = parseWebhookBody<WhatsAppWebhookPayload>(rawBody);
  if (!payload) return new NextResponse("Bad Request", { status: 400 });

  // Meta peut regrouper plusieurs comptes et plusieurs messages dans un envoi.
  // Accusé de réception immédiat : Meta relivre l'envoi si la réponse tarde, et
  // claimInboundMessage écarte les doublons par l'identifiant du message.
  const messages: PendingInboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of change.value?.messages ?? []) {
        if (message.type !== "text" || !message.text?.body || !message.id || !message.from) continue;
        messages.push({ accountId: phoneNumberId, contactId: message.from, text: message.text.body, externalId: message.id });
      }
    }
  }

  after(() =>
    processInboundBatch({
      channel: "WHATSAPP",
      usageType: "whatsapp_message",
      messages,
      send: async (clientService, message, replyText) => {
        await sendWhatsAppMessage(message.accountId, message.contactId, replyText, clientService.whatsappAccessToken);
        return true;
      },
    })
  );

  return NextResponse.json({ received: true });
}
