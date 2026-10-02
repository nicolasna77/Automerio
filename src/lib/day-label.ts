import { parisDayKey } from "@/lib/paris-day";

// La veille d'un jour parisien, calculée sur la date (à midi UTC) et non en
// retirant 24 heures : les jours de changement d'heure durent 23 ou 25 heures.
function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1, 12)).toISOString().slice(0, 10);
}

// « Aujourd'hui », « Hier », sinon « lun. 28 sept. » ; la clé est un jour
// parisien (AAAA-MM-JJ).
export function dayLabel(key: string): string {
  const today = parisDayKey(new Date());
  if (key === today) return "Aujourd'hui";
  if (key === previousDayKey(today)) return "Hier";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Complément de phrase pour un jour : « aujourd'hui », « hier », « le lun. 28 sept. ».
export function dayPhrase(key: string): string {
  const label = dayLabel(key);
  return label === "Aujourd'hui" || label === "Hier" ? label.toLowerCase() : `le ${label}`;
}
