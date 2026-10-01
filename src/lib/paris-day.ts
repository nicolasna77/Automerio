// Jours au sens de Paris (heure d'été comprise) : les appels sont filtrés par
// jour tel que le client le vit, pas par jour UTC.

const TIME_ZONE = "Europe/Paris";
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// « 2026-10-01 » pour la date donnée, à Paris.
export function parisDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

// Décalage de Paris par rapport à UTC, en minutes, à l'instant donné.
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

function parisMidnight(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - parisOffsetMinutes(guess) * 60_000);
}

// Début et fin (exclue) d'un jour parisien, ou null si la clé est invalide.
export function parisDayRange(key: string): { gte: Date; lt: Date } | null {
  if (!DAY_PATTERN.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const start = parisMidnight(year, month, day);
  if (Number.isNaN(start.getTime()) || parisDayKey(start) !== key) return null;
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { gte: start, lt: parisMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()) };
}
