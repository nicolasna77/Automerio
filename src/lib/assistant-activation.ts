// Activation d'une solution depuis l'assistant de chat : ce que le modèle
// voit du formulaire, et la remise en forme de ses réponses avant
// `activateService`, qui refait tous les contrôles (droits, prix, champs
// obligatoires). Logique pure, testable sans OpenAI.
import type OpenAI from "openai";
import {
  DEFAULT_WEEKLY_HOURS,
  PRODUCT_CATALOG_FIELD_KEY,
  WEEK_DAYS,
  isFieldVisible,
  type ConfigField,
  type Configuration,
  type RuleRow,
  type ServiceDTO,
  type WeeklyHours,
} from "@/lib/catalog";
import { calculateMonthlyPriceCents, isValidUnitSelection } from "@/lib/subscription-pricing";

// Mêmes champs que l'écran d'activation : le catalogue produits et les champs
// réglés après le paiement (numéro, comptes Meta…) sont exclus.
export function activationFields(service: Pick<ServiceDTO, "configFields">, hiddenKeys: string[]): ConfigField[] {
  return service.configFields.filter(
    (field) => field.key !== PRODUCT_CATALOG_FIELD_KEY && !hiddenKeys.includes(field.key)
  );
}

export function describeActivationForm(service: ServiceDTO, fields: ConfigField[]) {
  return {
    slug: service.slug,
    name: service.name,
    fields: fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      ...(field.helpText ? { help: field.helpText } : {}),
      ...(field.options ? { options: field.options } : {}),
      ...(field.showIf ? { onlyIf: field.showIf } : {}),
    })),
    volume: service.tier
      ? {
          unit: service.tier.unit,
          min: service.tier.minUnits,
          max: service.tier.maxUnits,
          step: service.tier.stepUnits,
        }
      : null,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TEXT_LENGTH = 2000;
const MAX_LIST_ITEMS = 50;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_TEXT_LENGTH);
  return trimmed || null;
}

function strings(value: unknown): string[] {
  return (Array.isArray(value) ? value : [])
    .map(text)
    .filter((item): item is string => item !== null)
    .slice(0, MAX_LIST_ITEMS);
}

function weeklyHours(value: unknown): WeeklyHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const hours = structuredClone(DEFAULT_WEEKLY_HOURS);
  let seen = false;
  for (const day of WEEK_DAYS) {
    const entry = raw[day];
    if (!entry || typeof entry !== "object") continue;
    const { closed, open, close } = entry as Record<string, unknown>;
    if (closed === true) {
      hours[day] = { ...hours[day], closed: true };
      seen = true;
    } else if (typeof open === "string" && typeof close === "string" && TIME.test(open) && TIME.test(close)) {
      hours[day] = { closed: false, open, close };
      seen = true;
    }
  }
  return seen ? hours : null;
}

function rules(value: unknown): RuleRow[] {
  return (Array.isArray(value) ? value : [])
    .flatMap((row: unknown) => {
      if (!row || typeof row !== "object") return [];
      const trigger = text((row as Record<string, unknown>).trigger);
      const target = text((row as Record<string, unknown>).target) ?? "";
      return trigger ? [{ trigger, target }] : [];
    })
    .slice(0, MAX_LIST_ITEMS);
}

// Les valeurs viennent du modèle : seuls les champs du formulaire, au bon
// format, sont gardés. Une valeur hors liste (select) est écartée, jamais
// devinée ; l'action signale ensuite le champ obligatoire manquant.
export function coerceConfiguration(fields: ConfigField[], raw: unknown): Configuration {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const configuration: Configuration = {};
  for (const field of fields) {
    const value = input[field.key];
    const allowed = new Set(field.options?.map((option) => option.value) ?? []);
    switch (field.type) {
      case "select": {
        const choice = text(value);
        if (choice && allowed.has(choice)) configuration[field.key] = choice;
        break;
      }
      case "multiselect": {
        const choices = strings(value).filter((choice) => allowed.has(choice));
        if (choices.length > 0) configuration[field.key] = choices;
        break;
      }
      case "tags": {
        const tags = strings(value);
        if (tags.length > 0) configuration[field.key] = tags;
        break;
      }
      case "consent":
        // Un accord ne se déduit pas : seulement un « oui » explicite.
        if (value === true || value === "true") configuration[field.key] = "true";
        break;
      case "weekly-hours": {
        const hours = weeklyHours(value);
        if (hours) configuration[field.key] = hours;
        break;
      }
      case "rules-list": {
        const rows = rules(value);
        if (rows.length > 0) configuration[field.key] = rows;
        break;
      }
      default: {
        const single = text(value);
        if (single) configuration[field.key] = single;
      }
    }
  }
  // Un champ masqué par une condition (showIf) ne doit pas être enregistré.
  for (const field of fields) {
    if (field.key in configuration && !isFieldVisible(field, configuration)) delete configuration[field.key];
  }
  return configuration;
}

// Prix mensuel de la solution pour le volume choisi, comme sur l'écran
// d'activation. Volume hors paliers : null.
export function monthlyPriceFor(
  service: Pick<ServiceDTO, "tier" | "monthlyPriceCents">,
  units: number | null
): number | null {
  if (!service.tier) return service.monthlyPriceCents;
  const chosen = units ?? service.tier.minUnits;
  return isValidUnitSelection(service.tier, chosen) ? calculateMonthlyPriceCents(service.tier, chosen) : null;
}

// Verrou côté serveur : la solution n'est créée (et le paiement ouvert) que si
// le dernier message de l'utilisateur est un accord clair. Le modèle a pris
// « je les remplirai plus tard » pour un oui : sa consigne ne suffit pas.
const CONFIRMATIONS = [
  "oui",
  "ouais",
  "ok",
  "okay",
  "d accord",
  "daccord",
  "je confirme",
  "confirme",
  "confirmer",
  "c est bon",
  "cest bon",
  "c est ok",
  "vas y",
  "allez y",
  "go",
  "valide",
  "je valide",
  "parfait",
  "yes",
  "tout a fait",
  "exactement",
  "absolument",
];
// Débuts de mots qui annulent un accord : « oui mais », « pas encore »…
const DOUBTS = ["non", "pas", "attend", "plus tard", "change", "modifi", "sauf", "mais"];
const MAX_CONFIRMATION_LENGTH = 80;

// Question qui clôt le récapitulatif : le « oui » doit lui répondre, pas à une
// autre question (« Avez-vous un code promo ? » « Oui »).
export const RECAP_QUESTION = "Confirmez-vous l'activation ?";

export function confirmsRecap(turns: { role: "user" | "assistant"; text: string }[]): boolean {
  const last = turns[turns.length - 1];
  const previous = turns[turns.length - 2];
  return (
    last?.role === "user" &&
    isExplicitConfirmation(last.text) &&
    previous?.role === "assistant" &&
    previous.text.trimEnd().endsWith(RECAP_QUESTION)
  );
}

export function isExplicitConfirmation(message: string): boolean {
  const raw = message.toLowerCase();
  if (raw.length > MAX_CONFIRMATION_LENGTH || raw.includes("?")) return false;
  const words = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (DOUBTS.some((doubt) => new RegExp(`(^| )${doubt}`).test(words))) return false;
  return CONFIRMATIONS.some((yes) => words === yes || words.startsWith(`${yes} `));
}

export function readUnits(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

const SLUG = { type: "string", description: "Identifiant de la solution, pris dans le catalogue (ex. « standard-telephonique-ia »)." };
const UNITS = { type: ["integer", "null"], description: "Volume mensuel choisi (minutes ou réponses), si le formulaire a un volume ; null sinon." };
const PROMO = { type: ["string", "null"], description: "Code promo donné par l'utilisateur, sinon null." };

export const ACTIVATION_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_my_organizations",
      description: "Liste les organisations (entreprises) de l'utilisateur connecté, et s'il peut y activer une solution.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activation_form",
      description: "Donne les réglages à demander pour activer une solution : libellés, obligatoires, options, volume possible.",
      parameters: { type: "object", properties: { slug: SLUG }, required: ["slug"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "quote_price",
      description:
        "Calcule le prix mensuel et le montant à payer aujourd'hui, avec un code promo éventuel. Seule source des prix à annoncer.",
      parameters: {
        type: "object",
        properties: { slug: SLUG, units: UNITS, promoCode: PROMO },
        required: ["slug", "units", "promoCode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "activate_service",
      description:
        "Crée la solution et ouvre le paiement. À appeler seulement après un récapitulatif et un « oui » explicite de l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          slug: SLUG,
          organizationId: { type: "string", description: "Identifiant renvoyé par list_my_organizations." },
          name: { type: "string", description: "Nom donné à la solution par l'utilisateur (ex. « Boutique Lyon »)." },
          configuration: {
            type: "object",
            description:
              'Réponses aux réglages, par clé du formulaire. Texte : chaîne ; select : valeur de l\'option ; multiselect et tags : liste ; consent : true ; weekly-hours : { mon: { closed, open: "09:00", close: "18:00" }, … } ; rules-list : [{ trigger, target }].',
          },
          units: UNITS,
          promoCode: PROMO,
        },
        required: ["slug", "organizationId", "name", "configuration", "units", "promoCode"],
      },
    },
  },
];
