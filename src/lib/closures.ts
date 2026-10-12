import { parisDayKey } from "@/lib/paris-day";

// Fermetures exceptionnelles d'une solution téléphonique (congés, jours
// fériés) : réglage `closures`, en texte libre, une période par ligne.
//   « 24/12/2026 - 02/01/2027 : congés de Noël »
//   « 15/08/2026 »
// Les lignes datées sont appliquées par le code (aucun créneau ces jours-là) ;
// toutes les lignes à venir sont aussi lues par l'assistant.

export type Closure = { start: string; end: string; label: string | null; line: string };

const DATE = String.raw`(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})`;
const RANGE = new RegExp(String.raw`^\s*${DATE}(?:\s*(?:-|–|au|à)\s*${DATE})?\s*(?::\s*(.*))?$`, "i");

function dayKey(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseClosures(value: unknown): Closure[] {
  if (typeof value !== "string") return [];
  return value.split(/\r?\n/).flatMap((raw) => {
    const line = raw.trim();
    const match = RANGE.exec(line);
    if (!match) return [];
    const start = dayKey(match[1], match[2], match[3]);
    const end = match[4] ? dayKey(match[4], match[5], match[6]) : start;
    if (!start || !end || end < start) return [];
    return [{ start, end, label: match[7]?.trim() || null, line }];
  });
}

// La fermeture qui couvre ce jour (heure de Paris), ou null.
export function closureOn(closures: Closure[], date: Date): Closure | null {
  const key = parisDayKey(date);
  return closures.find((closure) => closure.start <= key && key <= closure.end) ?? null;
}

// Lignes à donner à l'assistant : les périodes datées pas encore terminées,
// et les lignes que le code ne sait pas dater (lues telles quelles).
export function upcomingClosureLines(value: unknown, now: Date = new Date()): string[] {
  if (typeof value !== "string") return [];
  const today = parisDayKey(now);
  const dated = new Map(parseClosures(value).map((closure) => [closure.line, closure]));
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && (dated.get(line)?.end ?? today) >= today)
    .slice(0, 20);
}
