import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { validateMetaSignature, verifyMetaWebhookChallenge } from "@/lib/meta";
import {
  findLiveClientService,
  handleInboundMessage,
  parseWebhookBody,
  type LiveClientService,
} from "@/lib/inbound-message-guard";

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
  const services = new Map<string, LiveClientService | null>();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of change.value?.messages ?? []) {
        if (message.type !== "text" || !message.text?.body || !message.id || !message.from) continue;

        if (!services.has(phoneNumberId)) {
          services.set(phoneNumberId, await findLiveClientService("WHATSAPP", phoneNumberId));
        }
        const clientService = services.get(phoneNumberId);
        if (!clientService) continue;

        await handleInboundMessage({
          clientService,
          channel: "WHATSAPP",
          contactId: message.from,
          text: message.text.body,
          externalId: message.id,
          usageType: "whatsapp_message",
          send: async (replyText) => {
            await sendWhatsAppMessage(phoneNumberId, message.from, replyText, clientService.whatsappAccessToken);
            return true;
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
