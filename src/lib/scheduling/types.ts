// Outils de prise de rendez-vous branchés par clé API (Cal.com, Calendly).
// Google Agenda reste à part : il se connecte par OAuth (google-calendar.ts).

export const SCHEDULING_PROVIDERS = ["calcom", "calendly"] as const;
export type SchedulingProvider = (typeof SCHEDULING_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<SchedulingProvider | "google", string> = {
  google: "Google Agenda",
  calcom: "Cal.com",
  calendly: "Calendly",
};

export function isSchedulingProvider(value: unknown): value is SchedulingProvider {
  return (SCHEDULING_PROVIDERS as readonly unknown[]).includes(value);
}

// Un type de rendez-vous proposé au client pendant la connexion.
export type EventTypeOption = {
  id: string;
  name: string;
  durationMinutes: number;
  // Calendly : lieu à reprendre tel quel à la réservation.
  location: EventLocation | null;
};

export type EventLocation = { kind: string; location?: string };

export type ProviderAccount = {
  accountLabel: string;
  eventTypes: EventTypeOption[];
};

export type BookingRequest = {
  startAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  timeZone: string;
};

// Échec compréhensible par le client (clé refusée, offre gratuite…), affiché
// tel quel dans le tableau de bord.
export class SchedulingError extends Error {}
