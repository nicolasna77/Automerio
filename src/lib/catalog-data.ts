import type { ConfigField, ServiceCategory } from "@/lib/catalog";
import { SPEAKING_RATE_OPTIONS, TONE_OPTIONS, VOICE_OPTIONS } from "@/lib/voice-agent/voice";
import type { UsageUnit } from "@/lib/usage-cap";

export type CatalogService = {
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  monthlyPriceCents: number | null;
  includedUsageUnits: number | null;
  usageUnit: UsageUnit | null;
  overageUnitPriceCents: number | null;
  maxUsageUnits?: number | null;
  usageStepUnits?: number | null;
  extraUnitPriceCents?: number | null;
  configFields: ConfigField[];
  sortOrder: number;
};

export function catalogSyncFields(service: CatalogService) {
  return {
    configFields: service.configFields,
    maxUsageUnits: service.maxUsageUnits ?? null,
    usageStepUnits: service.usageStepUnits ?? null,
    extraUnitPriceCents: service.extraUnitPriceCents ?? null,
  };
}

const SLOT_DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

// Voix de l'assistant téléphonique : communes au standard et à la prise de
// rendez-vous, rangées dans l'onglet « Voix » des réglages.
const VOICE_FIELDS: CatalogService["configFields"] = [
  {
    key: "voice",
    label: "Voix de l'assistant",
    type: "select",
    options: [...VOICE_OPTIONS],
    placeholder: "Marin : voix féminine, naturelle (par défaut)",
    helpText: "Écoutez-la avec « Écouter un exemple », plus bas, sans passer d'appel.",
  },
  {
    key: "speakingRate",
    label: "Débit",
    type: "select",
    options: [...SPEAKING_RATE_OPTIONS],
    placeholder: "Normal (par défaut)",
  },
  {
    key: "tone",
    label: "Ton",
    type: "select",
    options: [...TONE_OPTIONS],
    placeholder: "Chaleureux (par défaut)",
  },
];

export const CATALOG: CatalogService[] = [
  {
    slug: "standard-telephonique-ia",
    name: "Standard téléphonique automatisé",
    description:
      "Réception et orientation automatique de vos appels entrants, 24h/24, avec transfert vers la bonne personne selon le motif de l'appel.",
    category: "COMMUNICATION",
    monthlyPriceCents: 2500,
    includedUsageUnits: 150,
    usageUnit: "MINUTE",
    overageUnitPriceCents: 14,
    maxUsageUnits: 6000,
    usageStepUnits: 50,
    extraUnitPriceCents: 13,
    configFields: [
      {
        key: "phoneLine",
        label: "Numéro existant à dévier",
        type: "tel",
        placeholder: "+33 6 12 34 56 78",
        helpText: "Laissez vide pour qu'un nouveau numéro vous soit attribué.",
      },
      {
        key: "openingHours",
        label: "Horaires d'ouverture",
        type: "weekly-hours",
      },
      {
        key: "greetingMessage",
        label: "Message d'accueil",
        type: "textarea",
        placeholder: "Bonjour, vous êtes bien chez ... Comment puis-je vous aider ?",
        helpText: "Optionnel. Un texte par défaut est utilisé si vous ne renseignez rien.",
      },
      {
        key: "callRouting",
        label: "Redirections selon le motif d'appel",
        type: "rules-list",
        helpText: "Ex. « Urgence » → 06 12 34 56 78",
      },
      {
        key: "callInstructions",
        label: "Consignes pour l'assistant",
        type: "textarea",
        placeholder: "Ex. demander d'abord s'il s'agit d'une urgence, puis noter l'adresse complète.",
        helpText: "Ce qu'il doit demander, noter ou éviter. Partez d'un modèle de votre secteur.",
      },
      ...VOICE_FIELDS,
    ],
    sortOrder: 1,
  },
  {
    slug: "prise-rdv-telephone",
    name: "Prise de rendez-vous / commande par téléphone",
    description:
      "Votre assistant automatisé décroche le téléphone, prend les rendez-vous et enregistre les commandes de vos clients.",
    category: "COMMUNICATION",
    monthlyPriceCents: 2500,
    includedUsageUnits: 150,
    usageUnit: "MINUTE",
    overageUnitPriceCents: 14,
    maxUsageUnits: 6000,
    usageStepUnits: 50,
    extraUnitPriceCents: 13,
    configFields: [
      {
        key: "objectives",
        label: "Objectif de l'appel",
        type: "multiselect",
        required: true,
        options: [
          { value: "appointment", label: "Rendez-vous" },
          { value: "order", label: "Prise de commande" },
        ],
        helpText: "Combinable : l'assistant identifie la demande de l'appelant.",
      },
      {
        key: "calendarLink",
        label: "Agenda",
        type: "url",
        placeholder: "https://calendly.com/...",
        showIf: { key: "objectives", includes: "appointment" },
      },
      {
        key: "appointmentTypes",
        label: "Prestations et durées",
        type: "rules-list",
        helpText: "Chaque prestation a sa durée : l'assistant réserve un créneau de la bonne longueur.",
        showIf: { key: "objectives", includes: "appointment" },
      },
      {
        key: "slotDuration",
        label: "Durée par défaut",
        type: "select",
        options: SLOT_DURATION_OPTIONS,
        helpText: "Pour une demande qui ne figure pas dans vos prestations.",
        showIf: { key: "objectives", includes: "appointment" },
      },
      {
        key: "productCatalog",
        label: "Menu / catalogue de produits",
        type: "textarea",
        required: true,
        placeholder: "Pizza Margherita — 9,50 €\nPizza Reine — 11,50 €",
        helpText: "Obligatoire pour la prise de commande. Un produit par ligne, avec le prix.",
        showIf: { key: "objectives", includes: "order" },
      },
      {
        key: "businessAddress",
        label: "Adresse de retrait des commandes",
        type: "address",
        helpText: "L'assistant la donne aux clients qui viennent chercher leur commande.",
        showIf: { key: "objectives", includes: "order" },
      },
      {
        key: "businessHours",
        label: "Horaires",
        type: "weekly-hours",
      },
      {
        key: "deliveryZone",
        label: "Zone de livraison",
        type: "text",
        placeholder: "Ex. Amiens et 10 km autour",
        helpText: "Seulement si vous livrez : les communes ou le rayon desservis. Laissez vide sinon.",
        showIf: { key: "objectives", includes: "order" },
      },
      {
        key: "callInstructions",
        label: "Consignes pour l'assistant",
        type: "textarea",
        placeholder: "Ex. toujours demander s'il s'agit d'un retrait ou d'une livraison.",
        helpText: "Ce qu'il doit demander, noter ou éviter. Partez d'un modèle de votre secteur.",
      },
      ...VOICE_FIELDS,
    ],
    sortOrder: 2,
  },
  {
    slug: "assistant-whatsapp",
    name: "Réponses automatiques sur WhatsApp",
    description:
      "Réponses instantanées à vos clients sur WhatsApp : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    monthlyPriceCents: 800,
    includedUsageUnits: 3000,
    usageUnit: "MESSAGE",
    overageUnitPriceCents: 25,
    maxUsageUnits: 30000,
    usageStepUnits: 1000,
    extraUnitPriceCents: 24,
    configFields: [
      {
        key: "whatsappNumber",
        label: "Numéro WhatsApp Business",
        type: "tel",
        required: true,
        placeholder: "+33 6 12 34 56 78",
      },
      { key: "faq", label: "Questions fréquentes", type: "textarea" },
    ],
    sortOrder: 3,
  },
  {
    slug: "assistant-facebook",
    name: "Réponses automatiques sur Messenger",
    description:
      "Réponses instantanées à vos clients sur Messenger : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    monthlyPriceCents: 800,
    includedUsageUnits: 3000,
    usageUnit: "MESSAGE",
    overageUnitPriceCents: 25,
    maxUsageUnits: 30000,
    usageStepUnits: 1000,
    extraUnitPriceCents: 24,
    configFields: [
      {
        key: "facebookPageName",
        label: "Nom de votre page Facebook",
        type: "text",
        required: true,
        placeholder: "Ex. Plomberie Lefèvre",
      },
      { key: "faq", label: "Questions fréquentes", type: "textarea" },
    ],
    sortOrder: 4,
  },
  {
    slug: "assistant-instagram",
    name: "Réponses automatiques sur Instagram",
    description:
      "Réponses instantanées à vos clients en messages privés Instagram : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    monthlyPriceCents: 800,
    includedUsageUnits: 3000,
    usageUnit: "MESSAGE",
    overageUnitPriceCents: 25,
    maxUsageUnits: 30000,
    usageStepUnits: 1000,
    extraUnitPriceCents: 24,
    configFields: [
      {
        key: "instagramUsername",
        label: "Nom d'utilisateur Instagram",
        type: "text",
        required: true,
        placeholder: "@plomberielefevre",
      },
      { key: "faq", label: "Questions fréquentes", type: "textarea" },
    ],
    sortOrder: 5,
  },
  {
    slug: "reponses-emails",
    name: "Réponses automatiques aux e-mails",
    description:
      "Votre boîte mail se trie et se priorise toute seule, avec des brouillons de réponse déjà prêts à envoyer.",
    category: "COMMUNICATION",
    monthlyPriceCents: 4900,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [
      {
        key: "mailbox",
        label: "Boîte mail",
        type: "connection",
        placeholder: "vous@gmail.com",
        helpText: "Gmail ou Outlook. Connexion finalisée par l'équipe Automerio.",
      },
      {
        key: "sortingRules",
        label: "Règles de tri",
        type: "rules-list",
        helpText: "Ex. « contient facture » → transférer à…",
      },
      { key: "replyTemplates", label: "Modèles de réponses", type: "file-link" },
    ],
    sortOrder: 6,
  },
  {
    slug: "prise-rdv-automatique",
    name: "Prise de rendez-vous automatique",
    description:
      "Vos clients réservent en ligne sur vos créneaux réels : synchronisation directe avec votre agenda.",
    category: "COMMUNICATION",
    monthlyPriceCents: 2900,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [
      {
        key: "calendarLink",
        label: "Agenda",
        type: "url",
        placeholder: "https://calendly.com/...",
        required: true,
      },
      { key: "availability", label: "Disponibilités", type: "weekly-hours" },
      {
        key: "slotDuration",
        label: "Durée d'un créneau",
        type: "select",
        options: SLOT_DURATION_OPTIONS,
      },
    ],
    sortOrder: 7,
  },


  {
    slug: "resume-pdf",
    name: "Résumé automatique de fichiers PDF",
    description:
      "Contrats, rapports, devis reçus : l'essentiel de vos documents longs en quelques lignes, sans tout relire.",
    category: "INFORMATION",
    monthlyPriceCents: 1900,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [
      {
        key: "sourceConnection",
        label: "Dossier source",
        type: "connection",
        helpText: "Drive, Dropbox ou boîte mail : le dossier où déposer vos PDF.",
      },
      {
        key: "summaryFormat",
        label: "Format de résumé",
        type: "select",
        options: [
          { value: "key_points", label: "Points clés" },
          { value: "detailed", label: "Synthèse détaillée" },
        ],
      },
    ],
    sortOrder: 13,
  },
  {
    slug: "resume-reunions",
    name: "Résumé automatique de réunions",
    description:
      "Un compte-rendu structuré de chaque réunion, à partir d'un enregistrement ou d'une transcription. Plus besoin de prendre des notes.",
    category: "INFORMATION",
    monthlyPriceCents: 2400,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [
      {
        key: "sourceConnection",
        label: "Outil de visio / dossier d'enregistrements",
        type: "connection",
        helpText: "Zoom / Teams / Meet, ou dépôt manuel des enregistrements.",
      },
      {
        key: "summaryFormat",
        label: "Format de compte-rendu",
        type: "select",
        options: [
          { value: "key_points", label: "Points clés" },
          { value: "detailed", label: "Compte-rendu détaillé" },
        ],
      },
      {
        key: "participantsConsent",
        label: "Consentement des participants",
        type: "consent",
        required: true,
        helpText: "Bloque l'activation tant que non coché (RGPD).",
      },
    ],
    sortOrder: 14,
  },
  {
    slug: "ocr-lecture-automatique",
    name: "OCR : lecture automatique de documents scannés",
    description:
      "Les données de vos PDF et factures scannées arrivent directement dans vos outils de gestion, sans ressaisie manuelle.",
    category: "INFORMATION",
    monthlyPriceCents: 3900,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [
      { key: "priorityDocTypes", label: "Types de documents prioritaires", type: "tags" },
      {
        key: "scanFolderConnection",
        label: "Dossier de réception des scans",
        type: "connection",
      },
      { key: "targetTool", label: "Outil de gestion cible", type: "text" },
    ],
    sortOrder: 15,
  },

  {
    slug: "support-prioritaire",
    name: "Support prioritaire",
    description:
      "Accompagnement dédié, en plus du support déjà inclus dans chacune de vos solutions.",
    category: "ABONNEMENT",
    monthlyPriceCents: 9900,
    includedUsageUnits: null,
    usageUnit: null,
    overageUnitPriceCents: null,
    configFields: [],
    sortOrder: 16,
  },
];
