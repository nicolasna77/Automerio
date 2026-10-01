"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canReadClientService, viewerOf } from "@/lib/client-service-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOpenAIClient } from "@/lib/openai";
import { ActionError, runAction } from "@/lib/run-action";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { toneInstructionOf, voiceSettingsOf } from "@/lib/voice-agent/voice";

const PREVIEW_MODEL = "gpt-4o-mini-tts";
const MAX_PREVIEW_CHARS = 300;

// Fait dire le message d'accueil avec la voix, le débit et le ton choisis,
// sans passer d'appel. Les réglages viennent du formulaire (pas encore
// enregistrés) et sont filtrés par voiceSettingsOf : une valeur inconnue
// retombe sur la valeur par défaut.
export async function previewVoice(
  clientServiceId: string,
  settings: { voice?: string; speakingRate?: string; tone?: string; greeting?: string }
) {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw new ActionError("Votre session a expiré. Reconnectez-vous.");

    const clientService = await db.clientService.findUniqueOrThrow({
      where: { id: clientServiceId },
      select: { organizationId: true, organization: { select: { name: true } }, service: { select: { slug: true } } },
    });
    if (!canReadClientService(clientService, await viewerOf(session.user.id))) {
      throw new ActionError("Cette solution n'appartient pas à votre organisation.");
    }
    if (!TELEPHONY_SERVICE_SLUGS.has(clientService.service.slug)) {
      throw new ActionError("L'écoute n'existe que pour les solutions téléphoniques.");
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new ActionError("L'écoute n'est pas disponible pour le moment.");
    }
    if (!(await checkRateLimit("voice-preview", session.user.id, "10 m", 20))) {
      throw new ActionError("Trop d'écoutes. Réessayez dans quelques minutes.");
    }

    const configuration = {
      voice: settings.voice ?? "",
      speakingRate: settings.speakingRate ?? "",
      tone: settings.tone ?? "",
    };
    const { voice, speed } = voiceSettingsOf(configuration);
    const company = clientService.organization.name;
    const text =
      settings.greeting?.trim().slice(0, MAX_PREVIEW_CHARS) ||
      `Bonjour, vous êtes bien chez ${company}. Je suis l'assistant virtuel de l'entreprise. Que puis-je faire pour vous ?`;

    const speech = await getOpenAIClient().audio.speech.create({
      model: PREVIEW_MODEL,
      voice,
      speed,
      input: text,
      instructions: `Assistant téléphonique d'une entreprise française, qui décroche un appel. Parle en français. ${toneInstructionOf(configuration)}`,
      response_format: "mp3",
    });
    const audio = Buffer.from(await speech.arrayBuffer()).toString("base64");
    return `data:audio/mpeg;base64,${audio}`;
  });
}
