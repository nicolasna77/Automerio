import {
  AudioLines,
  Clock,
  ListChecks,
  MessageSquareText,
  Settings2,
  Split,
  Store,
  Target,
  type LucideIcon,
} from "lucide-react";
import { isFieldVisible, type ConfigField, type Configuration } from "@/lib/catalog";

export type FieldCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: ConfigField[];
};

type CategoryDef = Omit<FieldCategory, "fields">;

// Catégories des réglages d'une solution, dans l'ordre : étapes de l'activation
// et cartes de la page de configuration. « Votre besoin » passe en premier :
// ses choix font apparaître d'autres champs.
const CATEGORIES = {
  need: {
    id: "need",
    title: "Votre besoin",
    description: "Ce que l'assistant doit faire pour vous.",
    icon: Target,
  },
  business: {
    id: "business",
    title: "Coordonnées",
    description: "Les numéros, adresses et comptes que l'assistant utilise.",
    icon: Store,
  },
  hours: {
    id: "hours",
    title: "Horaires",
    description: "Les jours et heures d'ouverture de votre activité.",
    icon: Clock,
  },
  preferences: {
    id: "preferences",
    title: "Préférences",
    description: "Les réglages de fonctionnement de la solution.",
    icon: Settings2,
  },
  messages: {
    id: "messages",
    title: "Instructions",
    description: "Ce que l'assistant dit à vos clients et les consignes qu'il suit.",
    icon: MessageSquareText,
  },
  rules: {
    id: "rules",
    title: "Règles",
    description: "Qui reçoit quoi, selon la demande du client.",
    icon: Split,
  },
  voice: {
    id: "voice",
    title: "Voix",
    description: "Comment l'assistant parle au téléphone.",
    icon: AudioLines,
  },
} satisfies Record<string, CategoryDef>;

const CATEGORY_BY_TYPE: Record<ConfigField["type"], CategoryDef> = {
  multiselect: CATEGORIES.need,
  tel: CATEGORIES.business,
  text: CATEGORIES.business,
  email: CATEGORIES.business,
  url: CATEGORIES.business,
  connection: CATEGORIES.business,
  "file-link": CATEGORIES.business,
  "weekly-hours": CATEGORIES.hours,
  select: CATEGORIES.preferences,
  tags: CATEGORIES.preferences,
  date: CATEGORIES.preferences,
  consent: CATEGORIES.preferences,
  textarea: CATEGORIES.messages,
  "rules-list": CATEGORIES.rules,
  address: CATEGORIES.business,
};

// Champs rangés par leur rôle plutôt que par leur type.
const CATEGORY_BY_KEY: Record<string, CategoryDef> = {
  voice: CATEGORIES.voice,
  speakingRate: CATEGORIES.voice,
  tone: CATEGORIES.voice,
  // Prestations et durées : à côté de la durée par défaut.
  appointmentTypes: CATEGORIES.preferences,
  // Adresse de retrait et zone de livraison : avec le choix « Prise de
  // commande » qui les fait apparaître.
  businessAddress: CATEGORIES.need,
  deliveryZone: CATEGORIES.need,
};

// Champs saisis à l'activation mais plus proposés dans les réglages : ils
// ne servent pas à l'assistant (les comptes passent par leur connexion, le
// renvoi par l'onglet Renvoi d'appel). Le lien d'agenda n'est masqué que là
// où l'onglet Connecteurs le remplace.
export function settingsHiddenKeys(serviceSlug: string): string[] {
  return [
    "phoneLine",
    "whatsappNumber",
    "facebookPageName",
    "instagramUsername",
    ...(serviceSlug === "prise-rdv-telephone" ? ["calendarLink"] : []),
  ];
}

const ORDER = Object.keys(CATEGORIES);

function categoryOf(field: ConfigField): CategoryDef {
  // Une section définie dans le catalogue prime sur le rangement par type.
  if (field.section) {
    return {
      id: `section:${field.section}`,
      title: field.section,
      description: "",
      icon: ListChecks,
    };
  }
  return CATEGORY_BY_KEY[field.key] ?? CATEGORY_BY_TYPE[field.type];
}

// Regroupe les champs visibles en étapes, sans étape vide. Les sections du
// catalogue suivent les catégories connues, dans leur ordre d'apparition.
export function buildFieldCategories(
  fields: ConfigField[],
  values: Configuration,
  omitKeys: string[] = []
): FieldCategory[] {
  const byId = new Map<string, FieldCategory>();
  for (const field of fields) {
    if (omitKeys.includes(field.key) || !isFieldVisible(field, values)) continue;
    const def = categoryOf(field);
    const category = byId.get(def.id);
    if (category) category.fields.push(field);
    else byId.set(def.id, { ...def, fields: [field] });
  }
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return Array.from(byId.values()).toSorted((a, b) => rank(a.id) - rank(b.id));
}
