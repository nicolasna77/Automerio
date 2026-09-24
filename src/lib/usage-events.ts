import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkQuotaAlerts } from "@/lib/overage-billing";

export type RecordUsageEventInput = {
  clientServiceId: string;
  type?: string;
  externalId?: string | null;
  status?: "in_progress" | "completed";
  occurredAt?: Date;
  durationSec?: number | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordUsageEvent(
  input: RecordUsageEventInput
): Promise<{ count: number }> {
  const clientService = await db.clientService.findUnique({
    where: { id: input.clientServiceId },
  });
  if (!clientService) {
    throw new Error("Unknown clientServiceId");
  }

  const { clientServiceId, externalId, durationSec, metadata } = input;
  const type = input.type ?? "call";
  const occurredAt = input.occurredAt ?? new Date();
  const status = input.status ?? "completed";

  if (externalId) {
    await db.usageEvent.upsert({
      where: { externalId },
      create: {
        clientServiceId,
        type,
        externalId,
        status,
        occurredAt,
        durationSec: durationSec ?? null,
        metadata,
        endedAt: status === "completed" ? new Date() : null,
      },
      update: {
        status,
        durationSec: durationSec ?? undefined,
        metadata,
        endedAt: status === "completed" ? new Date() : undefined,
      },
    });
  } else {
    await db.usageEvent.create({
      data: {
        clientServiceId,
        type,
        status: "completed",
        occurredAt,
        durationSec: durationSec ?? null,
        metadata,
      },
    });
  }

  // Un appel termine peut faire franchir un seuil du forfait. L'alerte ne doit
  // jamais faire echouer l'enregistrement de l'appel.
  if (status === "completed" && type === "call") {
    await checkQuotaAlerts(clientServiceId, { durationSec: durationSec ?? null }).catch((err) =>
      console.error(`[quota] vérification impossible pour ${clientServiceId} :`, err)
    );
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.usageEvent.count({
    where: {
      clientServiceId,
      type: "call",
      status: "completed",
      occurredAt: { gte: periodStart },
    },
  });

  return { count };
}
