import { NextResponse } from "next/server";
import { sendMessengerMessage } from "@/lib/messenger";
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

type MessengerWebhookPayload = {
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

  const payload = parseWebhookBody<MessengerWebhookPayload>(rawBody);
  if (!payload) return new NextResponse("Bad Request", { status: 400 });

  // Meta peut regrouper plusieurs comptes et plusieurs messages dans un envoi.
  const services = new Map<string, LiveClientService | null>();
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const pageId = event.recipient?.id;
      const senderId = event.sender?.id;
      const message = event.message;
      if (!pageId || !senderId || !message?.mid || !message.text || message.is_echo) continue;

      if (!services.has(pageId)) {
        services.set(pageId, await findLiveClientService("MESSENGER", pageId));
      }
      const clientService = services.get(pageId);
      if (!clientService) continue;

      await handleInboundMessage({
        clientService,
        channel: "MESSENGER",
        contactId: senderId,
        text: message.text,
        externalId: message.mid,
        usageType: "messenger_message",
        send: async (replyText) => {
          if (!clientService.facebookPageAccessToken) return false;
          await sendMessengerMessage(pageId, senderId, replyText, clientService.facebookPageAccessToken);
          return true;
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
