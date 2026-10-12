import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Appel que l'assistant n'a pas décroché (mis en pause, forfait épuisé) :
// enregistré pour être rappelé, sous un type à part. Tous les compteurs
// (forfait, dépassement, bilan, statistiques) filtrent sur le type « call » :
// un appel non décroché n'est jamais compté ni facturé.
export const MISSED_CALL_TYPE = "missed_call";

// Lignes de la liste des appels d'une solution : décrochés et non décrochés.
export const LISTED_CALL_TYPES = ["call", MISSED_CALL_TYPE];

export type MissedCallReason = "paused" | "quota";

export function readMissedReason(metadata: unknown): MissedCallReason | null {
  const value = ((metadata ?? {}) as Record<string, unknown>).missedReason;
  return value === "paused" || value === "quota" ? value : null;
}

// Une ligne par appel Twilio (CallSid unique) : un webhook rejoué n'en crée
// pas de seconde.
export async function recordMissedCall(input: {
  clientServiceId: string;
  callSid: string | null | undefined;
  from: string | null | undefined;
  reason: MissedCallReason;
}): Promise<void> {
  try {
    await db.usageEvent.create({
      data: {
        clientServiceId: input.clientServiceId,
        type: MISSED_CALL_TYPE,
        status: "completed",
        occurredAt: new Date(),
        durationSec: 0,
        externalId: input.callSid || null,
        metadata: { fromNumber: input.from || null, missedReason: input.reason },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}
