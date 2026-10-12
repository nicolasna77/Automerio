import { db } from "@/lib/db";
import { callerAppointments } from "./tools";

// Appelant qui rappelle : ce que la solution sait déjà de ce numéro (nom
// donné, dernier appel, prochain rendez-vous), donné à l'assistant avant de
// décrocher. Rien pour un numéro masqué.

const LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;

const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const DAY_TIME_LABEL = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export type CallerContext = {
  name: string | null;
  lastCall: { at: Date; reason: string | null } | null;
  nextAppointment: Date | null;
};

export async function loadCallerContext(
  clientServiceId: string,
  callerNumber: string,
  now: Date = new Date()
): Promise<CallerContext | null> {
  const [lastCall, appointments] = await Promise.all([
    db.usageEvent.findFirst({
      where: {
        clientServiceId,
        type: "call",
        occurredAt: { gte: new Date(now.getTime() - LOOKBACK_MS), lt: now },
        metadata: { path: ["fromNumber"], equals: callerNumber },
      },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true, callSummary: { select: { callerName: true, reason: true } } },
    }),
    callerAppointments(clientServiceId, callerNumber, now),
  ]);
  const next = appointments[0] ?? null;
  if (!lastCall && !next) return null;
  return {
    name: lastCall?.callSummary?.callerName ?? next?.customerName ?? null,
    lastCall: lastCall ? { at: lastCall.occurredAt, reason: lastCall.callSummary?.reason ?? null } : null,
    nextAppointment: next?.startAt ?? null,
  };
}

export function formatCallerContext(context: CallerContext): string {
  return [
    "Ce numéro est déjà connu de l'entreprise.",
    context.name ? `Nom donné lors d'un précédent échange : ${context.name}.` : "",
    context.lastCall
      ? `Dernier appel : ${DAY_LABEL.format(context.lastCall.at)}${context.lastCall.reason ? `, motif « ${context.lastCall.reason} »` : ""}.`
      : "",
    context.nextAppointment ? `Prochain rendez-vous : ${DAY_TIME_LABEL.format(context.nextAppointment)}.` : "",
    "Un téléphone se prête : si tu connais un nom, demande d'abord si tu parles bien à cette personne. Ne mentionne le rendez-vous ou le dernier appel qu'après sa confirmation, et seulement s'ils concernent sa demande. Ne lis jamais ces informations comme une liste.",
  ]
    .filter(Boolean)
    .join("\n");
}
