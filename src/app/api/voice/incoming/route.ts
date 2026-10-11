import { NextResponse, after } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { validateTwilioRequest } from "@/lib/twilio";
import { db } from "@/lib/db";
import { callRefusal } from "@/lib/voice-agent/call-gate";
import { sendMissedCallSms } from "@/lib/missed-call-sms";

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

  // Solution non payée ou résiliée, mise en pause par le client, ou forfait
  // atteint sans dépassement possible : l'assistant ne décroche pas
  // (call-gate.ts). Un numéro qui ne correspond à aucune solution non plus :
  // l'appel n'aboutirait nulle part chez OpenAI.
  // Toute erreur de lecture (base indisponible…) laisse passer l'appel : mieux
  // vaut décrocher un appel de trop que raccrocher au nez d'un client.
  let refusal: "paused" | "unavailable" | null = null;
  if (params.To) {
    try {
      const clientService = await db.clientService.findFirst({
        where: { externalPhoneNumber: params.To },
        include: { service: true, organization: { select: { name: true } } },
      });
      const reason = clientService ? await callRefusal(clientService) : null;
      if (!clientService) refusal = "unavailable";
      else if (reason) refusal = "paused";
      // En pause ou au forfait épuisé, la solution est en service : un SMS
      // garde le contact avec l'appelant. Pas pour une solution non payée ou
      // résiliée. Envoyé après la réponse, le message vocal n'attend pas.
      if (clientService && (reason === "paused" || reason === "quota")) {
        after(() =>
          sendMissedCallSms({ clientService, from: params.From }).catch((err) =>
            console.error("[voice] SMS d'appel non décroché impossible :", err)
          )
        );
      }
    } catch (err) {
      console.error("[voice] lecture du quota impossible, appel transmis :", err);
    }
  }
  if (refusal) {
    return new NextResponse(say(t(refusal)), { headers: { "Content-Type": "text/xml" } });
  }

  const sipUri = process.env.OPENAI_SIP_URI;
  const twiml = sipUri
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${sipUri}</Sip></Dial></Response>`
    : say(t("unavailable"));

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
