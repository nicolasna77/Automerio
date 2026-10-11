import { isOpenAt } from "@/lib/business-hours";
import type { WeeklyHours } from "@/lib/catalog";

// Statistiques d'activité d'une solution téléphonique sur une période : la
// preuve, chiffrée, de ce que l'assistant fait pour le client.

export const STATS_WINDOW_DAYS = 30;
const TOP_REASONS = 3;
const BOOKED_OUTCOMES = new Set(["appointment_booked", "order_taken"]);

export type CallStatsRow = {
  occurredAt: Date;
  outcome: string | null;
  reason: string | null;
};

export type CallStats = {
  total: number;
  // Part des appels terminés par un rendez-vous ou une commande (0 à 1).
  bookedShare: number | null;
  // Part des appels reçus hors horaires d'ouverture ; null sans horaires.
  outOfHoursShare: number | null;
  byHour: { hour: number; count: number }[];
  busiestHour: number | null;
  topReasons: { reason: string; count: number }[];
};

function parisHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(date);
  return Number(hour) % 24;
}

export function computeCallStats(rows: CallStatsRow[], hours: WeeklyHours | null): CallStats {
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const reasons = new Map<string, { reason: string; count: number }>();
  let booked = 0;
  let outOfHours = 0;

  for (const row of rows) {
    byHour[parisHour(row.occurredAt)].count += 1;
    if (row.outcome && BOOKED_OUTCOMES.has(row.outcome)) booked += 1;
    if (hours && !isOpenAt(hours, row.occurredAt)) outOfHours += 1;
    const reason = row.reason?.trim();
    if (reason) {
      // Même motif à la casse près : regroupé, affiché tel qu'écrit la première fois.
      const key = reason.toLocaleLowerCase("fr-FR");
      const entry = reasons.get(key) ?? { reason, count: 0 };
      entry.count += 1;
      reasons.set(key, entry);
    }
  }

  const total = rows.length;
  const busiest = byHour.reduce((best, slot) => (slot.count > best.count ? slot : best), byHour[0]);
  return {
    total,
    bookedShare: total > 0 ? booked / total : null,
    outOfHoursShare: total > 0 && hours ? outOfHours / total : null,
    byHour,
    busiestHour: total > 0 ? busiest.hour : null,
    topReasons: [...reasons.values()]
      .toSorted((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "fr"))
      .slice(0, TOP_REASONS),
  };
}
