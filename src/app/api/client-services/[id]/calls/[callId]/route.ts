import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { assertCanReadClientService } from "@/lib/client-service-access";
import type { TranscriptTurn } from "@/lib/voice-agent/call-transcript";

function readTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (turn): turn is TranscriptTurn =>
      typeof turn === "object" &&
      turn !== null &&
      (turn.speaker === "caller" || turn.speaker === "assistant") &&
      typeof turn.text === "string"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, callId } = await params;
  if (!(await assertCanReadClientService(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = await db.callSummary.findFirst({
    where: { usageEventId: callId, usageEvent: { clientServiceId: id } },
    select: { transcript: true },
  });
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ transcript: readTranscript(summary.transcript) });
}
