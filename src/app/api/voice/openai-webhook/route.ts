import { NextResponse, after } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import WebSocket from "ws";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool, toRealtimeTools } from "@/lib/voice-agent/tools";
import { recordUsageEvent } from "@/lib/usage-events";
import { TranscriptCollector, outcomeFromTools } from "@/lib/voice-agent/call-transcript";
import { finalizeCallSummary } from "@/lib/voice-agent/call-summary";
import { TEST_SIP_HEADER, readDemoCallId } from "@/lib/demo-call";
import type { TranscriptTurn } from "@/lib/voice-agent/call-transcript";
import { buildDemoPrompt } from "@/lib/voice-agent/demo-prompt";
import { loadDemoCatalog } from "@/lib/voice-agent/demo-catalog";

// Le temps pendant lequel un appel est suivi (voir `after` plus bas) : 800 s,
// le plafond du plan Pro de Vercel, soit un peu plus de 13 minutes d'appel.
export const maxDuration = 800;

const REALTIME_MODEL = "gpt-realtime";

// La transcription de l'appelant tourne sur un modele a part : sans elle, le
// resume ne connaitrait que ce que l'assistant a dit.
const INPUT_TRANSCRIPTION = { model: "gpt-4o-mini-transcribe", language: "fr" } as const;

function extractE164(sipHeaderValue: string): string | null {
  const match = sipHeaderValue.match(/(?:sip|tel):([+0-9]+)/i);
  return match ? match[1] : null;
}

function findSipHeader(
  headers: { name: string; value: string }[],
  name: string
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

export async function POST(request: Request) {
  const payload = await request.text();

  let event;
  try {
    event = await getOpenAIClient().webhooks.unwrap(payload, request.headers, process.env.OPENAI_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "realtime.call.incoming") {
    return NextResponse.json({ received: true });
  }

  const callId = event.data.call_id;

  // Un appel de test porte son propre en-tete : l'agent y joue la solution du
  // client avec sa configuration, sans rien enregistrer.
  const testCallId = readDemoCallId(event.data.sip_headers, TEST_SIP_HEADER);
  if (testCallId) {
    await acceptTestCall(callId, testCallId);
    return NextResponse.json({ received: true });
  }

  // Un appel d'essai porte son identifiant en en-tete SIP : il ne correspond a
  // aucun numero client et suit son propre chemin.
  const demoCallId = readDemoCallId(event.data.sip_headers);
  if (demoCallId) {
    await acceptDemoCall(callId, demoCallId);
    return NextResponse.json({ received: true });
  }

  const toHeader = findSipHeader(event.data.sip_headers, "To");
  const calledNumber = toHeader ? extractE164(toHeader) : null;

  const clientService = calledNumber
    ? await db.clientService.findFirst({
        where: { externalPhoneNumber: calledNumber },
        include: { service: true, organization: true, calendarConnection: true },
      })
    : null;

  if (!clientService) {
    return NextResponse.json({ received: true });
  }

  const configuration = (clientService.configuration ?? {}) as Configuration;
  const calendarConnected = !!clientService.calendarConnection;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, calendarConnected);

  try {
    await getOpenAIClient().realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: systemPrompt,
      tools: toRealtimeTools(tools),
      audio: {
        input: { format: { type: "audio/pcmu" }, transcription: INPUT_TRANSCRIPTION },
        output: { format: { type: "audio/pcmu" } },
      },
    });
  } catch (err) {
    console.error(`[voice] échec de l'acceptation de l'appel ${callId} :`, err);
    return NextResponse.json({ received: true });
  }

  const fromHeader = findSipHeader(event.data.sip_headers, "From");
  const fromNumber = fromHeader ? extractE164(fromHeader) : null;
  await recordUsageEvent({
    clientServiceId: clientService.id,
    externalId: callId,
    status: "in_progress",
    metadata: { fromNumber },
  }).catch((err) => console.error(`[voice] échec d'enregistrement de l'appel ${callId} :`, err));

  // `after` garde la fonction en vie apres la reponse, jusqu'a `maxDuration` :
  // une promesse lancee sans attente serait figee des la reponse envoyee, et
  // la fin de l'appel ne serait jamais enregistree. Au-dela de cette duree,
  // l'appel se poursuit mais n'est ni clos ni resume.
  after(() =>
    listenToCall({
      sipCallId: callId,
      clientServiceId: clientService.id,
      configuration,
      onFinish: async ({ durationSec, toolCalls, turns }) => {
        await recordUsageEvent({
          clientServiceId: clientService.id,
          externalId: callId,
          status: "completed",
          durationSec,
          metadata: { fromNumber, outcome: outcomeFromTools(toolCalls) },
        });
        await finalizeCallSummary({ usageEventExternalId: callId, clientServiceId: clientService.id, turns });
      },
    }).catch((err) => {
      console.error(`[voice] erreur sur la connexion d'événements de l'appel ${callId} :`, err);
    })
  );

  return NextResponse.json({ received: true });
}

type CallEnd = {
  durationSec: number;
  toolCalls: { name: string; result: string }[];
  turns: TranscriptTurn[];
};

/**
 * Suit un appel accepte : execute les outils que l'agent demande, garde la
 * transcription, puis passe la main a `onFinish` a la fin de l'appel. Le meme
 * suivi sert aux vrais appels et aux appels de test ; seuls les outils
 * (`testMode`) et la cloture different.
 */
function listenToCall({
  sipCallId,
  clientServiceId,
  configuration,
  testMode = false,
  onFinish,
}: {
  sipCallId: string;
  clientServiceId: string;
  configuration: Configuration;
  testMode?: boolean;
  onFinish: (end: CallEnd) => Promise<void>;
}): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const transcript = new TranscriptCollector();
    const toolCalls: { name: string; result: string }[] = [];
    // Un transfert coupe la session avant que l'outil ait rendu son resultat :
    // la cloture attend les outils en cours pour ne pas perdre leur issue.
    const pendingTools = new Set<Promise<void>>();
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${sipCallId}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      let realtimeEvent: {
        type?: string;
        name?: string;
        arguments?: string;
        call_id?: string;
        item_id?: string;
        item?: { id?: string; role?: string };
        transcript?: string;
      };
      try {
        realtimeEvent = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (transcript.handle(realtimeEvent)) return;
      if (realtimeEvent.type !== "response.function_call_arguments.done") return;

      const toolCallId = realtimeEvent.call_id;
      const toolName = realtimeEvent.name;
      if (!toolCallId || !toolName) return;

      const pending = (async () => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(realtimeEvent.arguments || "{}");
        } catch {
        }

        const result = await runTool(toolName, args, {
          clientServiceId,
          callId: sipCallId,
          configuration,
          testMode,
        });
        toolCalls.push({ name: toolName, result });

        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: toolCallId, output: result },
          })
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      })().catch((err) =>
        console.error(`[voice] échec de l'outil ${toolName} sur l'appel ${sipCallId} :`, err)
      );
      pendingTools.add(pending);
      pending.finally(() => pendingTools.delete(pending));
    });

    // `close` et `error` peuvent se suivre : l'appel ne se clot qu'une fois.
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      Promise.allSettled(pendingTools)
        .then(() => onFinish({ durationSec, toolCalls, turns: transcript.turns() }))
        .catch((err) => console.error(`[voice] échec de clôture de l'appel ${sipCallId} :`, err))
        .finally(resolve);
    };

    ws.on("close", finish);
    ws.on("error", finish);
  });
}

async function acceptDemoCall(callId: string, demoCallId: string): Promise<void> {
  // Seul un essai en cours d'appel est accepte : un identifiant rejoue, deja
  // termine ou inconnu ne rouvre pas de conversation.
  const demoCall = await db.demoCall.findUnique({ where: { id: demoCallId } });
  if (!demoCall || demoCall.status !== "CALLING") {
    console.warn(`[essai] appel ${callId} ignoré : essai ${demoCallId} introuvable ou déjà traité.`);
    return;
  }

  const [catalog, requested] = await Promise.all([
    loadDemoCatalog(),
    db.service.findUnique({ where: { slug: demoCall.serviceSlug }, select: { name: true } }),
  ]);

  try {
    await getOpenAIClient().realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: buildDemoPrompt(catalog, requested?.name ?? "Standard téléphonique"),
      audio: {
        input: { format: { type: "audio/pcmu" } },
        output: { format: { type: "audio/pcmu" } },
      },
    });
  } catch (err) {
    console.error(`[essai] échec de l'acceptation de l'appel ${callId} :`, err);
    await db.demoCall.update({ where: { id: demoCallId }, data: { status: "FAILED" } });
    return;
  }

  await db.demoCall.update({
    where: { id: demoCallId },
    data: { status: "IN_PROGRESS", openaiCallId: callId },
  });

  after(() =>
    trackDemoCall(callId, demoCallId).catch((err) =>
      console.error(`[essai] erreur sur la connexion d'événements de l'appel ${callId} :`, err)
    )
  );
}

/** Garde la connexion d'evenements ouverte pour noter la fin et la duree de l'essai. */
function trackDemoCall(sipCallId: string, demoCallId: string): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${sipCallId}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      db.demoCall
        .update({
          where: { id: demoCallId },
          data: { status: "COMPLETED", durationSec: Math.round((Date.now() - startedAt) / 1000) },
        })
        .catch((err) => console.error(`[essai] échec de clôture de l'essai ${demoCallId} :`, err))
        .finally(resolve);
    };

    ws.on("close", finish);
    ws.on("error", finish);
  });
}

async function acceptTestCall(callId: string, testCallId: string): Promise<void> {
  // Comme pour l'essai : seul un test en cours d'appel ouvre une conversation.
  const testCall = await db.testCall.findUnique({
    where: { id: testCallId },
    include: {
      clientService: { include: { service: true, organization: true, calendarConnection: true } },
    },
  });
  if (!testCall || testCall.status !== "CALLING") {
    console.warn(`[test] appel ${callId} ignoré : test ${testCallId} introuvable ou déjà traité.`);
    return;
  }

  const { clientService } = testCall;
  const configuration = (clientService.configuration ?? {}) as Configuration;
  const calendarConnected = !!clientService.calendarConnection;

  try {
    await getOpenAIClient().realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: buildSystemPrompt(clientService.service.slug, configuration, {
        calendarConnected,
        companyName: clientService.organization.name,
      }),
      tools: toRealtimeTools(getToolDefinitions(clientService.service.slug, configuration, calendarConnected)),
      audio: {
        input: { format: { type: "audio/pcmu" } },
        output: { format: { type: "audio/pcmu" } },
      },
    });
  } catch (err) {
    console.error(`[test] échec de l'acceptation de l'appel ${callId} :`, err);
    await db.testCall.update({ where: { id: testCallId }, data: { status: "FAILED" } });
    return;
  }

  await db.testCall.update({
    where: { id: testCallId },
    data: { status: "IN_PROGRESS", openaiCallId: callId },
  });

  // Ni evenement d'usage ni resume : un test ne compte pas dans le forfait et
  // n'apparait pas dans l'historique des appels.
  after(() =>
    listenToCall({
      sipCallId: callId,
      clientServiceId: clientService.id,
      configuration,
      testMode: true,
      onFinish: async ({ durationSec }) => {
        await db.testCall.update({
          where: { id: testCallId },
          data: { status: "COMPLETED", durationSec },
        });
      },
    }).catch((err) => console.error(`[test] erreur sur la connexion d'événements de l'appel ${callId} :`, err))
  );
}
