import {
  AudioLines,
  Clock,
  ListChecks,
  MessageSquareText,
  Settings2,
  Split,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { isFieldVisible, type ConfigField, type Configuration } from "@/lib/catalog";

export type FieldCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: ConfigField[];
};

type CategoryDef = Omit<FieldCategory, "fields">;

type KnownCategoryId = "need" | "hours" | "preferences" | "messages" | "rules" | "voice";

// Titre et description d'une catégorie connue (Dashboard.fieldCategories).
export type DescribeCategory = (id: KnownCategoryId) => { title: string; description: string };

// Catégories des réglages d'une solution, dans l'ordre : étapes de l'activation
// et cartes de la page de configuration. « Votre besoin » passe en premier :
// ses choix font apparaître d'autres champs. Les textes sont posés par
// buildFieldCategories.
const known = (id: KnownCategoryId, icon: LucideIcon): CategoryDef => ({ id, title: "", description: "", icon });
const CATEGORIES = {
  need: known("need", Target),
  hours: known("hours", Clock),
  preferences: known("preferences", Settings2),
  messages: known("messages", MessageSquareText),
  rules: known("rules", Split),
  voice: known("voice", AudioLines),
} satisfies Record<KnownCategoryId, CategoryDef>;

export function useDescribeCategory(): DescribeCategory {
  const t = useTranslations("Dashboard.fieldCategories");
  return (id) => ({ title: t(`${id}.title`), description: t(`${id}.description`) });
}

const CATEGORY_BY_TYPE: Record<ConfigField["type"], CategoryDef> = {
  multiselect: CATEGORIES.need,
  tel: CATEGORIES.preferences,
  text: CATEGORIES.preferences,
  email: CATEGORIES.preferences,
  url: CATEGORIES.preferences,
  connection: CATEGORIES.preferences,
  "file-link": CATEGORIES.preferences,
  "weekly-hours": CATEGORIES.hours,
  select: CATEGORIES.preferences,
  tags: CATEGORIES.preferences,
  date: CATEGORIES.preferences,
  consent: CATEGORIES.preferences,
  textarea: CATEGORIES.messages,
  "rules-list": CATEGORIES.rules,
  address: CATEGORIES.preferences,
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
  omitKeys: string[] = [],
  describe?: DescribeCategory
): FieldCategory[] {
  const byId = new Map<string, FieldCategory>();
  for (const field of fields) {
    if (omitKeys.includes(field.key) || !isFieldVisible(field, values)) continue;
    const def = categoryOf(field);
    const category = byId.get(def.id);
    if (category) category.fields.push(field);
    else if (describe && def.id in CATEGORIES)
      byId.set(def.id, { ...def, ...describe(def.id as KnownCategoryId), fields: [field] });
    else byId.set(def.id, { ...def, fields: [field] });
  }
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return Array.from(byId.values()).toSorted((a, b) => rank(a.id) - rank(b.id));
}
