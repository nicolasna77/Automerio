import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { validateTwilioRequest } from "@/lib/twilio";
import { db } from "@/lib/db";
import { isPausedByQuota } from "@/lib/overage-billing";

// Message lu à l'appelant puis fin d'appel. Le texte vient de messages/*.json
// (espace « Voice ») ; échappé, car il est inséré dans du XML.
function say(message: string): string {
  message = message.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">${message}</Say><Hangup/></Response>`;
}

export async function POST(request: Request) {
  const signature = request.headers.get("X-Twilio-Signature");
  const formData = await request.formData();
  const params = Object.fromEntries(formData.entries()) as Record<string, string>;

  if (!validateTwilioRequest(signature, params)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Voice" });

  // Forfait atteint sans dépassement possible : l'assistant ne décroche pas.
  // Toute erreur de lecture (base indisponible…) laisse passer l'appel : mieux
  // vaut décrocher un appel de trop que raccrocher au nez d'un client.
  let paused = false;
  if (params.To) {
    try {
      const clientService = await db.clientService.findFirst({
        where: { externalPhoneNumber: params.To },
        include: { service: true },
      });
      paused = clientService ? await isPausedByQuota(clientService) : false;
    } catch (err) {
      console.error("[voice] lecture du quota impossible, appel transmis :", err);
    }
  }
  if (paused) {
    return new NextResponse(say(t("paused")), { headers: { "Content-Type": "text/xml" } });
  }

  const sipUri = process.env.OPENAI_SIP_URI;
  const twiml = sipUri
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${sipUri}</Sip></Dial></Response>`
    : say(t("unavailable"));

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
