import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import { sendCallSummaryEmail } from "@/lib/email/notifications";
import {
  formatTranscriptForSummary,
  parseSummaryResponse,
  type CallSummaryFields,
  type TranscriptTurn,
} from "./call-transcript";

const SUMMARY_MODEL = "gpt-5-mini";

const EMPTY_FIELDS: CallSummaryFields = { reason: null, summary: null, followUp: null, callerName: null };

async function summarize(turns: TranscriptTurn[], companyName: string): Promise<CallSummaryFields> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: SUMMARY_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `Tu résumes un appel reçu par l'assistant téléphonique de ${companyName}, pour le gérant qui n'a pas pu décrocher.`,
          "Réponds en JSON avec exactement ces clés, en français :",
          '- "reason" : le motif de l\'appel en quelques mots (ex. « Fuite sous l\'évier, intervention urgente ») ;',
          '- "summary" : ce qui a été dit et convenu, en deux ou trois phrases ;',
          '- "followUp" : ce que le gérant doit faire ensuite (ex. « Rappeler avant 18 h »), ou "" s\'il n\'y a rien à faire ;',
          '- "callerName" : le nom donné par l\'appelant, ou "" s\'il ne l\'a pas dit.',
          "N'invente rien qui ne figure pas dans la transcription.",
        ].join("\n"),
      },
      { role: "user", content: formatTranscriptForSummary(turns) },
    ],
  });
  return parseSummaryResponse(completion.choices[0]?.message.content);
}

/**
 * Enregistre la transcription d'un appel termine, la resume, et previent
 * l'equipe du client. Chaque etape echoue sans emporter les autres : sans
 * resume, la transcription reste ; sans e-mail, le resume reste.
 */
export async function finalizeCallSummary(input: {
  usageEventExternalId: string;
  clientServiceId: string;
  turns: TranscriptTurn[];
}): Promise<void> {
  if (input.turns.length === 0) return;

  const [usageEvent, clientService] = await Promise.all([
    db.usageEvent.findUnique({ where: { externalId: input.usageEventExternalId }, select: { id: true } }),
    db.clientService.findUnique({
      where: { id: input.clientServiceId },
      select: { name: true, organizationId: true, organization: { select: { name: true } } },
    }),
  ]);
  if (!usageEvent || !clientService) return;

  let fields = EMPTY_FIELDS;
  try {
    fields = await summarize(input.turns, clientService.organization.name);
  } catch (err) {
    console.error(`[appel] résumé impossible pour ${usageEvent.id} :`, err);
  }

  await db.callSummary.upsert({
    where: { usageEventId: usageEvent.id },
    create: {
      usageEventId: usageEvent.id,
      transcript: input.turns as unknown as Prisma.InputJsonValue,
      ...fields,
    },
    update: { transcript: input.turns as unknown as Prisma.InputJsonValue, ...fields },
  });

  if (!fields.summary) return;

  const members = await db.member.findMany({
    where: { organizationId: clientService.organizationId },
    select: { user: { select: { email: true, name: true, notificationPreferences: true } } },
  });
  await Promise.allSettled(
    members.map(({ user }) =>
      sendCallSummaryEmail(user, {
        serviceName: clientService.name,
        clientServiceId: input.clientServiceId,
        reason: fields.reason,
        summary: fields.summary!,
        followUp: fields.followUp,
        callerName: fields.callerName,
      })
    )
  );
}
