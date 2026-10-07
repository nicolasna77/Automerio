import { NextResponse, after } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import WebSocket from "ws";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { voiceSettingsOf } from "@/lib/voice-agent/voice";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import {
  createToolSession,
  getToolDefinitions,
  runTool,
  toRealtimeTools,
  type ToolDefinition,
} from "@/lib/voice-agent/tools";
import { recordUsageEvent } from "@/lib/usage-events";
import { TranscriptCollector, outcomeFromTools } from "@/lib/voice-agent/call-transcript";
import { finalizeCallSummary } from "@/lib/voice-agent/call-summary";
import { TEST_SIP_HEADER, readDemoCallId } from "@/lib/demo-call";
import type { TranscriptTurn } from "@/lib/voice-agent/call-transcript";
import { buildDemoPrompt } from "@/lib/voice-agent/demo-prompt";
import { loadDemoCatalog } from "@/lib/voice-agent/demo-catalog";
import { parseToolArguments } from "@/lib/messaging-agent";

export const maxDuration = 800;

const REALTIME_MODEL = "gpt-realtime";

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

// Agenda de la solution : Google, ou un outil branché par clé (Cal.com,
// Calendly). Ces derniers envoient une confirmation par e-mail, l'agent peut
// donc proposer à l'appelant de donner son adresse.
function calendarOf(clientService: {
  calendarConnection: unknown;
  schedulingConnection: { durationMinutes: number } | null;
}): { calendarConnected: boolean; collectsEmail: boolean; fixedDurationMinutes: number | null } {
  const collectsEmail = !!clientService.schedulingConnection;
  return {
    calendarConnected: collectsEmail || !!clientService.calendarConnection,
    collectsEmail,
    // Cal.com et Calendly réservent avec la durée de leur type d'événement.
    fixedDurationMinutes: clientService.schedulingConnection?.durationMinutes ?? null,
  };
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

  const testCallId = readDemoCallId(event.data.sip_headers, TEST_SIP_HEADER);
  if (testCallId) {
    await acceptTestCall(callId, testCallId);
    return NextResponse.json({ received: true });
  }

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
        include: { service: true, organization: true, calendarConnection: true, schedulingConnection: true },
      })
    : null;

  if (!clientService) {
    return NextResponse.json({ received: true });
  }

  const configuration = (clientService.configuration ?? {}) as Configuration;
  const { calendarConnected, collectsEmail, fixedDurationMinutes } = calendarOf(clientService);
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected,
    collectsEmail,
    fixedDurationMinutes,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(
    clientService.service.slug,
    configuration,
    calendarConnected,
    collectsEmail
  );

  try {
    await getOpenAIClient().realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: systemPrompt,
      tools: toRealtimeTools(tools),
      audio: {
        input: { format: { type: "audio/pcmu" }, transcription: INPUT_TRANSCRIPTION },
        output: { format: { type: "audio/pcmu" }, ...voiceSettingsOf(configuration) },
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

  after(() =>
    listenToCall({
      sipCallId: callId,
      clientServiceId: clientService.id,
      configuration,
      tools,
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

function listenToCall({
  sipCallId,
  clientServiceId,
  configuration,
  tools,
  testMode = false,
  onFinish,
}: {
  sipCallId: string;
  clientServiceId: string;
  configuration: Configuration;
  // Outils proposés à l'appel : les seuls que l'agent peut exécuter.
  tools: ToolDefinition[];
  testMode?: boolean;
  onFinish: (end: CallEnd) => Promise<void>;
}): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const transcript = new TranscriptCollector();
    const toolCalls: { name: string; result: string }[] = [];
    const pendingTools = new Set<Promise<void>>();
    const session = createToolSession(tools);
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
        const args = parseToolArguments(realtimeEvent.arguments);

        const result = await runTool(toolName, args, {
          clientServiceId,
          callId: sipCallId,
          configuration,
          session,
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
  const testCall = await db.testCall.findUnique({
    where: { id: testCallId },
    include: {
      clientService: { include: { service: true, organization: true, calendarConnection: true, schedulingConnection: true } },
    },
  });
  if (!testCall || testCall.status !== "CALLING") {
    console.warn(`[test] appel ${callId} ignoré : test ${testCallId} introuvable ou déjà traité.`);
    return;
  }

  const { clientService } = testCall;
  const configuration = (clientService.configuration ?? {}) as Configuration;
  const { calendarConnected, collectsEmail, fixedDurationMinutes } = calendarOf(clientService);
  const tools = getToolDefinitions(clientService.service.slug, configuration, calendarConnected, collectsEmail);

  try {
    await getOpenAIClient().realtime.calls.accept(callId, {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: buildSystemPrompt(clientService.service.slug, configuration, {
        calendarConnected,
        collectsEmail,
        fixedDurationMinutes,
        companyName: clientService.organization.name,
      }),
      tools: toRealtimeTools(tools),
      audio: {
        input: { format: { type: "audio/pcmu" } },
        output: { format: { type: "audio/pcmu" }, ...voiceSettingsOf(configuration) },
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

  after(() =>
    listenToCall({
      sipCallId: callId,
      clientServiceId: clientService.id,
      configuration,
      tools,
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
