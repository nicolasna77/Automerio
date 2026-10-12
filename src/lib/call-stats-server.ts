import { db } from "@/lib/db";
import { asWeeklyHours } from "@/lib/business-hours";
import type { Configuration } from "@/lib/catalog";
import { computeCallStats, STATS_WINDOW_DAYS, type CallStats } from "@/lib/call-stats";

// Appels terminés des 30 derniers jours d'une solution, réduits en
// statistiques (src/lib/call-stats.ts). Horaires du standard
// (openingHours) ou de la prise de rendez-vous (businessHours).
export async function loadCallStats(clientServiceId: string, configuration: Configuration): Promise<CallStats> {
  const since = new Date(Date.now() - STATS_WINDOW_DAYS * 86_400_000);
  const rows = await db.usageEvent.findMany({
    where: { clientServiceId, type: "call", status: "completed", occurredAt: { gte: since } },
    select: { occurredAt: true, metadata: true, callSummary: { select: { reason: true } } },
  });
  return computeCallStats(
    rows.map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        occurredAt: row.occurredAt,
        outcome: typeof metadata.outcome === "string" ? metadata.outcome : null,
        reason: row.callSummary?.reason ?? null,
      };
    }),
    asWeeklyHours(configuration.openingHours ?? configuration.businessHours)
  );
}
