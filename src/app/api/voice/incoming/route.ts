import { NextResponse } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio";
import { db } from "@/lib/db";
import { isPausedByQuota } from "@/lib/overage-billing";

function say(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">${message}</Say><Hangup/></Response>`;
}

export async function POST(request: Request) {
  const signature = request.headers.get("X-Twilio-Signature");
  const formData = await request.formData();
  const params = Object.fromEntries(formData.entries()) as Record<string, string>;

  if (!validateTwilioRequest(signature, params)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Dépassement refusé et forfait atteint : l'assistant ne décroche pas.
  const clientService = params.To
    ? await db.clientService.findFirst({
        where: { externalPhoneNumber: params.To },
        include: { service: true },
      })
    : null;
  const paused = clientService
    ? await isPausedByQuota(clientService).catch((err) => {
        console.error("[voice] lecture du quota impossible :", err);
        return false;
      })
    : false;
  if (paused) {
    return new NextResponse(
      say("Nous ne pouvons pas prendre votre appel pour le moment, merci de rappeler plus tard."),
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  const sipUri = process.env.OPENAI_SIP_URI;
  const twiml = sipUri
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>${sipUri}</Sip></Dial></Response>`
    : say("Service momentanément indisponible, merci de rappeler plus tard.");

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
