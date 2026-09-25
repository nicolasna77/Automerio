import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Les appels qui attendent un geste du client : ceux dont le resume dit quoi
 * faire ensuite (« rappeler avant 18 h ») et qu'il n'a pas encore marques
 * comme traites.
 */
export function pendingCallbacksWhere(organizationId: string): Prisma.UsageEventWhereInput {
  return {
    type: "call",
    status: "completed",
    handledAt: null,
    clientService: { organizationId },
    callSummary: { followUp: { not: null } },
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
};

export async function listPendingCallbacks(organizationId: string, limit = 5): Promise<PendingCallback[]> {
  const rows = await db.usageEvent.findMany({
    where: pendingCallbacksWhere(organizationId),
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
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
    };
  });
}
