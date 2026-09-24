import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import WebSocket from "ws";
import { db } from "@/lib/db";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool, toRealtimeTools } from "@/lib/voice-agent/tools";
import { recordUsageEvent } from "@/lib/usage-events";
import { readDemoCallId } from "@/lib/demo-call";
import { buildDemoPrompt } from "@/lib/voice-agent/demo-prompt";
import { loadDemoCatalog } from "@/lib/voice-agent/demo-catalog";

const REALTIME_MODEL = "gpt-realtime";

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
        input: { format: { type: "audio/pcmu" } },
        output: { format: { type: "audio/pcmu" } },
      },
    });
  } catch (err) {
    console.error(`[voice] échec de l'acceptation de l'appel ${callId} :`, err);
    return NextResponse.json({ received: true });
  }

  const fromHeader = findSipHeader(event.data.sip_headers, "From");
  await recordUsageEvent({
    clientServiceId: clientService.id,
    externalId: callId,
    status: "in_progress",
    metadata: { fromNumber: fromHeader ? extractE164(fromHeader) : null },
  }).catch((err) => console.error(`[voice] échec d'enregistrement de l'appel ${callId} :`, err));

  listenToCall(callId, clientService.id, configuration).catch((err) => {
    console.error(`[voice] erreur sur la connexion d'événements de l'appel ${callId} :`, err);
  });

  return NextResponse.json({ received: true });
}

function listenToCall(
  sipCallId: string,
  clientServiceId: string,
  configuration: Configuration
): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${sipCallId}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      let realtimeEvent: { type?: string; name?: string; arguments?: string; call_id?: string };
      try {
        realtimeEvent = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (realtimeEvent.type !== "response.function_call_arguments.done") return;

      const toolCallId = realtimeEvent.call_id;
      const toolName = realtimeEvent.name;
      if (!toolCallId || !toolName) return;

      (async () => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(realtimeEvent.arguments || "{}");
        } catch {
        }

        const result = await runTool(toolName, args, {
          clientServiceId,
          callId: sipCallId,
          configuration,
        });

        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: toolCallId, output: result },
          })
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      })();
    });

    const finish = () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      recordUsageEvent({
        clientServiceId,
        externalId: sipCallId,
        status: "completed",
        durationSec,
      })
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

  trackDemoCall(callId, demoCallId).catch((err) =>
    console.error(`[essai] erreur sur la connexion d'événements de l'appel ${callId} :`, err)
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
