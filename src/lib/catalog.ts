import type { UsageCap } from "@/lib/usage-cap";
import type { SubscriptionTier } from "@/lib/subscription-pricing";
import {
  countCatalogItems,
  describeProductCatalog,
  isProductCatalog,
  readProductCatalog,
  type CatalogSection,
} from "@/lib/product-catalog";

export type ServiceCategory =
  | "COMMUNICATION"
  | "ADMINISTRATION"
  | "INFORMATION"
  | "ABONNEMENT";

export type ClientServiceStatus =
  | "PENDING_PAYMENT"
  | "CONFIGURING"
  | "ACTIVE"
  | "CANCELED";

export const TELEPHONY_SERVICE_SLUGS = new Set([
  "prise-rdv-telephone",
  "standard-telephonique-ia",
]);

export const WHATSAPP_SERVICE_SLUG = "assistant-whatsapp";
export const FACEBOOK_SERVICE_SLUG = "assistant-facebook";
export const INSTAGRAM_SERVICE_SLUG = "assistant-instagram";

export const PRODUCT_CATALOG_FIELD_KEY = "productCatalog";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEK_DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export type WeeklyHours = Record<
  WeekDay,
  { closed: boolean; open: string; close: string }
>;

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = WEEK_DAYS.reduce(
  (acc, day) => {
    acc[day] = { closed: true, open: "09:00", close: "18:00" };
    return acc;
  },
  {} as WeeklyHours
);

// Premier champ d'horaires où un jour ouvert ferme avant (ou à) son ouverture.
export function findInvalidWeeklyHours(
  fields: ConfigField[],
  values: Configuration
): ConfigField | undefined {
  return fields.find((field) => {
    if (field.type !== "weekly-hours" || !isFieldVisible(field, values)) return false;
    const hours = values[field.key] as WeeklyHours | undefined;
    if (!hours || typeof hours !== "object" || Array.isArray(hours)) return false;
    return WEEK_DAYS.some((day) => hours[day] && !hours[day].closed && hours[day].close <= hours[day].open);
  });
}

export type RuleRow = { trigger: string; target: string };

export type ConfigValue = string | string[] | WeeklyHours | RuleRow[] | CatalogSection[];
export type Configuration = Record<string, ConfigValue>;

export type ConfigField = {
  key: string;
  label: string;
  type:
    | "text"
    | "tel"
    | "email"
    | "url"
    | "textarea"
    | "select"
    | "tags"
    | "multiselect"
    | "date"
    | "weekly-hours"
    | "rules-list"
    | "address"
    | "file-link"
    | "consent"
    | "connection";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  section?: string;
  showIf?: { key: string; includes: string };
};

export const CATEGORY_ORDER: ServiceCategory[] = [
  "COMMUNICATION",
  "ADMINISTRATION",
  "INFORMATION",
  "ABONNEMENT",
];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  COMMUNICATION: "Communication client automatisée",
  ADMINISTRATION: "Administration automatisée",
  INFORMATION: "Traitement de l'information",
  ABONNEMENT: "Abonnement",
};

export const CATEGORY_DESCRIPTIONS: Record<ServiceCategory, string> = {
  COMMUNICATION:
    "Vos clients obtiennent une réponse immédiate, sur tous vos canaux, sans mobiliser votre temps.",
  ADMINISTRATION:
    "Devis, factures, contrats, relances : vos documents administratifs se génèrent et se suivent tout seuls.",
  INFORMATION:
    "Vos documents et réunions sont lus, résumés et classés automatiquement.",
  ABONNEMENT:
    "Un suivi continu pour que vos automatisations restent performantes dans la durée.",
};

export const STATUS_LABELS: Record<ClientServiceStatus, string> = {
  PENDING_PAYMENT: "Paiement en cours",
  CONFIGURING: "En configuration",
  ACTIVE: "Actif",
  CANCELED: "Résilié",
};

export function formatPrice(monthlyPriceCents: number | null): string {
  return monthlyPriceCents === null ? "—" : `${formatCents(monthlyPriceCents)}/mois`;
}

// Le montant sans le symbole « € » : pour afficher le chiffre en Plex Mono et
// l'unité en texte courant, sans l'espace insécable élargi par la chasse fixe.
export function formatEuroAmount(cents: number): string {
  return formatCents(cents).replace(/\s€$/, "");
}

export function formatCents(cents: number, locale = "fr-FR"): string {
  const whole = cents % 100 === 0;
  const digits = { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 };
  if (locale.startsWith("fr")) return (cents / 100).toLocaleString(locale, digits) + " €";
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR", ...digits });
}

export type ServiceDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  monthlyPriceCents: number | null;
  usageCap: UsageCap | null;
  tier: SubscriptionTier | null;
  configFields: ConfigField[];
  sortOrder: number;
};

export type ServiceMenuItem = Pick<ServiceDTO, "slug" | "name" | "category">;

export type BookingDTO = {
  id: string;
  kind: string;
  customerName: string;
  customerPhone: string;
  startAt: Date | null;
  endAt: Date | null;
  googleEventId: string | null;
  externalBookingId: string | null;
  notes: string | null;
  createdAt: Date;
};

export type ServiceEventType =
  | "CREATED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "ACTIVATED"
  | "NOTE_ADDED"
  | "PHONE_ASSIGNED"
  | "CALENDAR_CONNECTED"
  | "CALENDAR_DISCONNECTED"
  | "WHATSAPP_CONNECTED"
  | "WHATSAPP_DISCONNECTED"
  | "FACEBOOK_CONNECTED"
  | "FACEBOOK_DISCONNECTED"
  | "INSTAGRAM_CONNECTED"
  | "INSTAGRAM_DISCONNECTED"
  | "CONFIGURATION_UPDATED"
  | "QUOTA_CHANGED"
  | "QUOTA_WARNING"
  | "QUOTA_EXCEEDED"
  | "CANCELED";

export const SERVICE_EVENT_LABELS: Record<ServiceEventType, string> = {
  CREATED: "Demande d'activation envoyée",
  PAYMENT_RECEIVED: "Paiement reçu",
  PAYMENT_FAILED: "Paiement refusé",
  ACTIVATED: "Solution vérifiée et activée",
  NOTE_ADDED: "Note de l'équipe Automerio",
  PHONE_ASSIGNED: "Numéro de téléphone attribué",
  CALENDAR_CONNECTED: "Agenda connecté",
  CALENDAR_DISCONNECTED: "Agenda déconnecté",
  WHATSAPP_CONNECTED: "Compte WhatsApp connecté",
  WHATSAPP_DISCONNECTED: "Compte WhatsApp déconnecté",
  FACEBOOK_CONNECTED: "Page Facebook connectée",
  FACEBOOK_DISCONNECTED: "Page Facebook déconnectée",
  INSTAGRAM_CONNECTED: "Compte Instagram connecté",
  INSTAGRAM_DISCONNECTED: "Compte Instagram déconnecté",
  QUOTA_CHANGED: "Volume de l'abonnement modifié",
  QUOTA_WARNING: "80 % du forfait consommé",
  QUOTA_EXCEEDED: "Forfait dépassé",
  CONFIGURATION_UPDATED: "Configuration mise à jour",
  CANCELED: "Solution résiliée",
};

export type ServiceEventDTO = {
  id: string;
  type: ServiceEventType;
  message: string | null;
  createdAt: Date;
};

export type MyServiceDTO = {
  clientServiceId: string;
  name: string;
  status: ClientServiceStatus;
  configuration: Configuration;
  adminNote: string | null;
  createdAt: Date;
  activatedAt: Date | null;
  canceledAt: Date | null;
  paymentFailedAt: Date | null;
  externalPhoneNumber: string | null;
  calendarConnected: boolean;
  // L'agenda branché, sans aucun secret : outil, compte, type de rendez-vous.
  calendar: {
    provider: "google" | "calcom" | "calendly";
    account: string;
    eventTypeName: string | null;
  } | null;
  whatsappConnected: boolean;
  whatsappDisplayNumber: string | null;
  facebookConnected: boolean;
  facebookPageName: string | null;
  instagramConnected: boolean;
  instagramUsername: string | null;
  bookings: BookingDTO[];
  events: ServiceEventDTO[];
  service: ServiceDTO;
};

export function formatConfigValue(value: ConfigValue, key?: string): string {
  if (key === PRODUCT_CATALOG_FIELD_KEY || isProductCatalog(value)) {
    return describeProductCatalog(readProductCatalog(value));
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "string") return (value as string[]).join(", ");
    return (value as RuleRow[])
      .map((rule) => `${rule.trigger} → ${rule.target}`)
      .join(" · ");
  }
  const openDays = WEEK_DAYS.filter((day) => !value[day].closed).map(
    (day) => `${WEEK_DAY_LABELS[day]} ${value[day].open}–${value[day].close}`
  );
  return openDays.length > 0 ? openDays.join(" · ") : "Fermé toute la semaine";
}

export function formatConfigField(
  field: ConfigField | undefined,
  key: string,
  value: ConfigValue
): string {
  const options = field?.options;
  const labelOf = (raw: string) => options?.find((option) => option.value === raw)?.label ?? raw;
  if (options && typeof value === "string") return labelOf(value);
  if (options && Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value.length > 0 ? (value as string[]).map(labelOf).join(", ") : "—";
  }
  return formatConfigValue(value, key);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function describeServiceStatus(item: {
  status: ClientServiceStatus;
  createdAt: Date;
  activatedAt: Date | null;
  canceledAt: Date | null;
}): string {
  switch (item.status) {
    case "ACTIVE":
      return item.activatedAt
        ? `Actif depuis le ${formatDate(item.activatedAt)}`
        : "Actif";
    case "PENDING_PAYMENT":
      return `En attente de paiement depuis le ${formatDate(item.createdAt)}`;
    case "CONFIGURING":
      return "Paiement confirmé. Déploiement en cours par l'équipe Automerio";
    case "CANCELED":
      return item.canceledAt ? `Résilié le ${formatDate(item.canceledAt)}` : "Résilié";
  }
}

type SetupSubject = {
  status: ClientServiceStatus;
  externalPhoneNumber: string | null;
  calendarConnected: boolean;
  whatsappConnected: boolean;
  facebookConnected: boolean;
  instagramConnected: boolean;
  configuration: Configuration;
  service: { slug: string };
};

function isDeployable(status: ClientServiceStatus): boolean {
  return status === "ACTIVE" || status === "CONFIGURING";
}

export function canEditConfiguration(item: {
  status: ClientServiceStatus;
  service: { configFields: ConfigField[] };
}): boolean {
  return isDeployable(item.status) && item.service.configFields.length > 0;
}

export function needsProductCatalog(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    asStringArray(item.configuration.objectives).includes("order") &&
    countCatalogItems(readProductCatalog(item.configuration[PRODUCT_CATALOG_FIELD_KEY])) === 0
  );
}

export function needsPhoneNumber(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    TELEPHONY_SERVICE_SLUGS.has(item.service.slug) &&
    !item.externalPhoneNumber
  );
}

export function needsCalendarConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    asStringArray(item.configuration.objectives).includes("appointment") &&
    !item.calendarConnected
  );
}

export function needsWhatsAppConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === WHATSAPP_SERVICE_SLUG &&
    !item.whatsappConnected
  );
}

export function needsFacebookConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === FACEBOOK_SERVICE_SLUG &&
    !item.facebookConnected
  );
}

export function needsInstagramConnection(item: SetupSubject): boolean {
  return (
    isDeployable(item.status) &&
    item.service.slug === INSTAGRAM_SERVICE_SLUG &&
    !item.instagramConnected
  );
}

export const SETUP_ANCHOR = "mise-en-service";

export type SetupAction = { hint: string; cta: string };

const SETUP_ACTIONS: { needs: (item: SetupSubject) => boolean; action: SetupAction }[] = [
  {
    needs: needsPhoneNumber,
    action: {
      hint: "Choisissez un numéro pour que l'IA puisse décrocher",
      cta: "Choisir un numéro",
    },
  },
  {
    needs: needsWhatsAppConnection,
    action: {
      hint: "Connectez votre compte WhatsApp pour que l'IA puisse répondre",
      cta: "Connecter WhatsApp",
    },
  },
  {
    needs: needsFacebookConnection,
    action: {
      hint: "Connectez votre Page Facebook pour que l'IA puisse répondre",
      cta: "Connecter ma Page",
    },
  },
  {
    needs: needsInstagramConnection,
    action: {
      hint: "Connectez votre compte Instagram pour que l'IA puisse répondre",
      cta: "Connecter Instagram",
    },
  },
  {
    needs: needsProductCatalog,
    action: {
      hint: "Ajoutez votre carte pour que l'IA prenne les commandes",
      cta: "Ajouter ma carte",
    },
  },
  {
    needs: needsCalendarConnection,
    action: {
      hint: "Connectez votre agenda pour recevoir les rendez-vous",
      cta: "Connecter mon agenda",
    },
  },
];

export function setupAction(item: SetupSubject): SetupAction | null {
  return SETUP_ACTIONS.find(({ needs }) => needs(item))?.action ?? null;
}

export function setupHint(item: SetupSubject): string | null {
  return setupAction(item)?.hint ?? null;
}

export function asStringArray(value: ConfigValue | undefined): string[] {
  return Array.isArray(value) && (value.length === 0 || typeof value[0] === "string")
    ? (value as string[])
    : [];
}

export type AppointmentType = { name: string; minutes: number | null };

// Prestations de la prise de rendez-vous : chacune a sa durée. Les anciens
// réglages (une simple liste de noms) restent lisibles : la durée est alors
// celle par défaut. Une durée absente ou invalide vaut null.
export function readAppointmentTypes(value: ConfigValue | undefined): AppointmentType[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).flatMap((entry) => {
    if (typeof entry === "string") return entry.trim() ? [{ name: entry.trim(), minutes: null }] : [];
    if (entry && typeof entry === "object" && "trigger" in entry) {
      const row = entry as RuleRow;
      const minutes = Number.parseInt(String(row.target), 10);
      return row.trigger.trim()
        ? [{ name: row.trigger.trim(), minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null }]
        : [];
    }
    return [];
  });
}

export function asRuleRows(value: ConfigValue | undefined): RuleRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is RuleRow =>
      typeof row === "object" && row !== null && "trigger" in row && "target" in row
  );
}

export function isFieldVisible(field: ConfigField, values: Configuration): boolean {
  if (!field.showIf) return true;
  const target = values[field.showIf.key];
  if (Array.isArray(target)) {
    return (target as unknown[]).includes(field.showIf.includes);
  }
  return target === field.showIf.includes;
}

export function isFieldEmpty(field: ConfigField, values: Configuration): boolean {
  const value = values[field.key];
  if (field.key === PRODUCT_CATALOG_FIELD_KEY) return countCatalogItems(readProductCatalog(value)) === 0;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return !value;
}

export function withCleanProductCatalog(configuration: Configuration): Configuration {
  if (!(PRODUCT_CATALOG_FIELD_KEY in configuration)) return configuration;
  return {
    ...configuration,
    [PRODUCT_CATALOG_FIELD_KEY]: readProductCatalog(configuration[PRODUCT_CATALOG_FIELD_KEY]),
  };
}

export function findMissingRequiredField(
  fields: ConfigField[],
  values: Configuration
) {
  return fields.find(
    (field) =>
      field.required &&
      field.key !== PRODUCT_CATALOG_FIELD_KEY &&
      isFieldVisible(field, values) &&
      isFieldEmpty(field, values)
  );
}
