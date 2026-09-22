import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { assertCanReadClientService } from "@/lib/client-service-access";

const RECENT_LIMIT = 15;

function readMetadata(metadata: unknown) {
  const m = (metadata ?? {}) as Record<string, unknown>;
  return {
    fromNumber: typeof m.fromNumber === "string" ? m.fromNumber : null,
    outcome: typeof m.outcome === "string" ? m.outcome : null,
    endedReason: typeof m.endedReason === "string" ? m.endedReason : null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertCanReadClientService(id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [inProgressRows, recentRows] = await Promise.all([
    db.usageEvent.findMany({
      where: { clientServiceId: id, type: "call", status: "in_progress" },
      orderBy: { occurredAt: "desc" },
    }),
    db.usageEvent.findMany({
      where: { clientServiceId: id, type: "call", status: "completed" },
      orderBy: { occurredAt: "desc" },
      take: RECENT_LIMIT,
    }),
  ]);

  return NextResponse.json({
    inProgress: inProgressRows.map((row) => ({
      id: row.id,
      startedAt: row.occurredAt.toISOString(),
      ...readMetadata(row.metadata),
    })),
    recent: recentRows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      durationSec: row.durationSec,
      ...readMetadata(row.metadata),
    })),
  });
}
