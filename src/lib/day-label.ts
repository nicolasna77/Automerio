// La veille d'un jour parisien, calculée sur la date (à midi UTC) et non en
// retirant 24 heures : les jours de changement d'heure durent 23 ou 25 heures.
export function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1, 12)).toISOString().slice(0, 10);
}
