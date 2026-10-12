import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MISSED_CALL_TYPE, readMissedReason, type MissedCallReason } from "@/lib/missed-calls";

export function pendingCallbacksWhere(organizationId: string): Prisma.UsageEventWhereInput {
  return {
    status: "completed",
    handledAt: null,
    clientService: { organizationId },
    OR: [{ type: "call", callSummary: { followUp: { not: null } } }, { type: MISSED_CALL_TYPE }],
  };
}

export function countPendingCallbacks(organizationId: string): Promise<number> {
  return db.usageEvent.count({ where: pendingCallbacksWhere(organizationId) });
}

export type PendingCallback = {
  id: string;
  clientServiceId: string;
  serviceName: string;
  occurredAt: Date;
  fromNumber: string | null;
  callerName: string | null;
  reason: string | null;
  followUp: string;
  // Appel non décroché (assistant en pause, forfait épuisé).
  missedReason: MissedCallReason | null;
};

export async function listPendingCallbacks(organizationId: string, limit = 5): Promise<PendingCallback[]> {
  const rows = await db.usageEvent.findMany({
    where: pendingCallbacksWhere(organizationId),
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      occurredAt: true,
      metadata: true,
      clientService: { select: { id: true, name: true } },
      callSummary: { select: { callerName: true, reason: true, followUp: true } },
    },
  });

  return rows.map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      clientServiceId: row.clientService.id,
      serviceName: row.clientService.name,
      occurredAt: row.occurredAt,
      fromNumber: typeof metadata.fromNumber === "string" ? metadata.fromNumber : null,
      callerName: row.callSummary?.callerName ?? null,
      reason: row.callSummary?.reason ?? null,
      followUp: row.callSummary?.followUp ?? "",
      missedReason: row.type === MISSED_CALL_TYPE ? (readMissedReason(row.metadata) ?? "paused") : null,
    };
  });
}
