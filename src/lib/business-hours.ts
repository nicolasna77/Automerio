import { WEEK_DAYS, type Configuration, type WeeklyHours } from "@/lib/catalog";

/**
 * Les horaires d'ouverture d'une solution, lus a l'heure de Paris : le serveur
 * tourne en UTC, les horaires des clients sont ceux de leur boutique.
 */

export function asWeeklyHours(value: Configuration[string] | undefined): WeeklyHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as WeeklyHours;
}

const INTL_WEEKDAY_TO_WEEK_DAY: Record<string, (typeof WEEK_DAYS)[number]> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/**
 * L'entreprise etait-elle ouverte a cet instant ? Sans horaires renseignes, on
 * la considere ouverte : mieux vaut ne rien compter « hors horaires » que
 * compter a tort.
 */
export function isOpenAt(hours: WeeklyHours | null, date: Date): boolean {
  if (!hours) return true;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourPart = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutePart = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const day = INTL_WEEKDAY_TO_WEEK_DAY[weekdayPart] ?? "mon";

  const today = hours[day];
  if (!today || today.closed) return false;
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const currentMinutes = hourPart * 60 + minutePart;
  return currentMinutes >= openH * 60 + openM && currentMinutes < closeH * 60 + closeM;
}

/** Les horaires d'une solution, quel que soit le champ qui les porte. */
export function hoursOf(configuration: Configuration): WeeklyHours | null {
  return asWeeklyHours(configuration.businessHours) ?? asWeeklyHours(configuration.openingHours);
}
