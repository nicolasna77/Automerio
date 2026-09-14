import type { ConfigField, ServiceCategory } from "@/lib/catalog";

export type CatalogService = {
  slug: string;
  name: string;
  description: string;
  category: ServiceCategory;
  setupFeeCents: number | null;
  monthlyPriceCents: number | null;
  usageCapLabel: string | null;
  configFields: ConfigField[];
  sortOrder: number;
};

const SLOT_DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

export const CATALOG: CatalogService[] = [
  {
    slug: "standard-telephonique-ia",
    name: "Standard téléphonique automatisé",
    description:
      "Réception et orientation automatique de vos appels entrants, 24h/24, avec transfert intelligent vers la bonne personne.",
    category: "COMMUNICATION",
    setupFeeCents: 90000,
    monthlyPriceCents: 7900,
    usageCapLabel: "150 min incluses, puis 0,30 €/min",
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
        helpText: "Optionnel — un texte par défaut est utilisé si vous ne renseignez rien.",
      },
      {
        key: "callRouting",
        label: "Redirections selon le motif d'appel",
        type: "rules-list",
        helpText: "Ex. « Urgence » → 06 12 34 56 78",
      },
    ],
    sortOrder: 1,
  },
  {
    slug: "prise-rdv-telephone",
    name: "Prise de rendez-vous / commande par téléphone",
    description:
      "Votre assistant automatisé décroche le téléphone, prend les rendez-vous et enregistre les commandes de vos clients.",
    category: "COMMUNICATION",
    setupFeeCents: 45000,
    monthlyPriceCents: 4900,
    usageCapLabel: "100 appels inclus, puis 0,30 €/appel",
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
        label: "Types de rendez-vous",
        type: "tags",
        showIf: { key: "objectives", includes: "appointment" },
      },
      {
        key: "slotDuration",
        label: "Durée d'un créneau",
        type: "select",
        options: SLOT_DURATION_OPTIONS,
        showIf: { key: "objectives", includes: "appointment" },
      },
      {
        key: "productCatalog",
        label: "Menu / catalogue de produits",
        type: "textarea",
        required: true,
        placeholder: "Pizza Margherita — 9,50 €\nPizza Reine — 11,50 €",
        helpText: "Obligatoire pour la prise de commande — un produit par ligne, avec le prix.",
        showIf: { key: "objectives", includes: "order" },
      },
      {
        key: "businessAddress",
        label: "Adresse (retrait/livraison)",
        type: "text",
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
        type: "textarea",
        showIf: { key: "objectives", includes: "order" },
      },
      {
        key: "callInstructions",
        label: "Consignes pour les appels",
        type: "textarea",
        placeholder: "Ex. toujours demander emporter ou livraison",
        showIf: { key: "objectives", includes: "order" },
      },
    ],
    sortOrder: 2,
  },
  {
    slug: "assistant-whatsapp",
    name: "Assistant WhatsApp",
    description:
      "Réponses instantanées à vos clients sur WhatsApp : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    setupFeeCents: 45000,
    monthlyPriceCents: 5900,
    usageCapLabel: null,
    configFields: [
      {
        key: "whatsappNumber",
        label: "Numéro WhatsApp Business",
        type: "tel",
        required: true,
        placeholder: "+33 6 12 34 56 78",
      },
      {
        key: "metaConnection",
        label: "Connexion Meta Business",
        type: "text",
      },
      { key: "faq", label: "Questions fréquentes", type: "textarea" },
    ],
    sortOrder: 3,
  },
  {
    slug: "assistant-facebook",
    name: "Assistant Facebook Messenger",
    description:
      "Réponses instantanées à vos clients sur Messenger : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    setupFeeCents: 45000,
    monthlyPriceCents: 5900,
    usageCapLabel: null,
    configFields: [
      {
        key: "facebookPageName",
        label: "Nom de votre page Facebook",
        type: "text",
        required: true,
        placeholder: "Ex. Plomberie Lefèvre",
      },
      {
        key: "metaConnection",
        label: "Connexion Meta Business",
        type: "text",
      },
      { key: "faq", label: "Questions fréquentes", type: "textarea" },
    ],
    sortOrder: 4,
  },
  {
    slug: "assistant-instagram",
    name: "Assistant Instagram",
    description:
      "Réponses instantanées à vos clients en messages privés Instagram : questions fréquentes, devis, disponibilités.",
    category: "COMMUNICATION",
    setupFeeCents: 45000,
    monthlyPriceCents: 5900,
    usageCapLabel: null,
    configFields: [
      {
        key: "instagramUsername",
        label: "Nom d'utilisateur Instagram",
        type: "text",
        required: true,
        placeholder: "@plomberielefevre",
      },
      {
        key: "metaConnection",
        label: "Connexion Meta Business",
        type: "text",
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
    setupFeeCents: 35000,
    monthlyPriceCents: 4900,
    usageCapLabel: null,
    configFields: [
      {
        key: "mailbox",
        label: "Boîte mail",
        type: "connection",
        placeholder: "vous@gmail.com",
        helpText: "Gmail ou Outlook — connexion finalisée par l'équipe Automerio.",
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
    setupFeeCents: 30000,
    monthlyPriceCents: 2900,
    usageCapLabel: null,
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
    slug: "devis-factures-bons-commande",
    name: "Devis, factures et bons de commande",
    description:
      "Devis, facturation et bons de commande générés et suivis automatiquement, avec vos informations d'entreprise pré-remplies.",
    category: "ADMINISTRATION",
    setupFeeCents: 30000,
    monthlyPriceCents: 2900,
    usageCapLabel: null,
    configFields: [
      { key: "logo", label: "Logo", type: "url", placeholder: "https://…" },
      { key: "siret", label: "SIRET", type: "text" },
      { key: "vatRegime", label: "Régime de TVA", type: "text" },
      { key: "iban", label: "IBAN / BIC", type: "text" },
      {
        key: "productCatalog",
        label: "Catalogue produits/services",
        type: "textarea",
        placeholder: "Solution A — 120 €\nSolution B — 45 €",
      },
      { key: "existingTemplate", label: "Modèle existant", type: "file-link" },
      {
        key: "legalNotice",
        label: "Mentions légales à afficher (devis)",
        type: "textarea",
      },
    ],
    sortOrder: 8,
  },
  {
    slug: "contrats-courriers-administratifs",
    name: "Contrats et courriers administratifs",
    description:
      "Contrats types et courriers officiels adaptés à votre activité, générés et remplis automatiquement.",
    category: "ADMINISTRATION",
    setupFeeCents: 35000,
    monthlyPriceCents: 2400,
    usageCapLabel: null,
    configFields: [
      { key: "documentTypes", label: "Types fréquents", type: "tags" },
      {
        key: "existingTemplates",
        label: "Modèles existants",
        type: "file-link",
        helpText: "Plusieurs fichiers possibles — un lien par modèle.",
      },
      {
        key: "tone",
        label: "Ton souhaité (courriers)",
        type: "select",
        options: [
          { value: "formal", label: "Formel" },
          { value: "friendly", label: "Convivial" },
        ],
      },
    ],
    sortOrder: 9,
  },
  {
    slug: "relance-impayes",
    name: "Relance automatique des impayés",
    description:
      "Relances progressives et personnalisées par e-mail jusqu'au règlement, sans y penser. Nécessite « Devis, factures et bons de commande » déjà actif.",
    category: "ADMINISTRATION",
    setupFeeCents: 25000,
    monthlyPriceCents: 2900,
    usageCapLabel: null,
    configFields: [
      {
        key: "invoicingConnection",
        label: "Connexion outil de facturation",
        type: "connection",
        helpText: "Ou dépôt d'un export régulier.",
      },
      {
        key: "reminderSchedule",
        label: "Échéancier de relance",
        type: "rules-list",
        helpText: "Ex. J+7 → e-mail doux, J+30 → courrier",
      },
    ],
    sortOrder: 10,
  },
  {
    slug: "signature-electronique",
    name: "Signature électronique",
    description:
      "Faites signer devis et contrats en ligne, avec valeur légale et archivage automatique.",
    category: "ADMINISTRATION",
    setupFeeCents: 20000,
    monthlyPriceCents: 2900,
    usageCapLabel: null,
    configFields: [
      {
        key: "signatureProvider",
        label: "Solution de signature",
        type: "select",
        options: [
          { value: "yousign", label: "Yousign" },
          { value: "docusign", label: "DocuSign" },
          { value: "other", label: "Autre" },
        ],
      },
      { key: "documentTypes", label: "Documents types à signer", type: "tags" },
    ],
    sortOrder: 11,
  },
  {
    slug: "archivage-intelligent",
    name: "Archivage intelligent des documents",
    description:
      "Classement automatique de vos documents par client, date et type — retrouvez tout en un instant.",
    category: "ADMINISTRATION",
    setupFeeCents: 35000,
    monthlyPriceCents: 2900,
    usageCapLabel: null,
    configFields: [
      {
        key: "storageConnection",
        label: "Espace de stockage",
        type: "connection",
        helpText: "Drive / Dropbox / OneDrive.",
      },
      { key: "classificationRules", label: "Règles de classement", type: "rules-list" },
    ],
    sortOrder: 12,
  },

  {
    slug: "resume-pdf",
    name: "Résumé automatique de fichiers PDF",
    description:
      "Contrats, rapports, devis reçus : l'essentiel de vos documents longs en quelques lignes, sans tout relire.",
    category: "INFORMATION",
    setupFeeCents: 15000,
    monthlyPriceCents: 1900,
    usageCapLabel: null,
    configFields: [
      {
        key: "sourceConnection",
        label: "Dossier source",
        type: "connection",
        helpText: "Drive / Dropbox / boîte mail — dossier où déposer vos PDF.",
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
      "Un compte-rendu structuré de chaque réunion, à partir d'un enregistrement ou d'une transcription — plus besoin de prendre des notes.",
    category: "INFORMATION",
    setupFeeCents: 20000,
    monthlyPriceCents: 2400,
    usageCapLabel: null,
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
    name: "OCR — lecture automatique de documents scannés",
    description:
      "Les données de vos PDF et factures scannées arrivent directement dans vos outils de gestion, sans ressaisie manuelle.",
    category: "INFORMATION",
    setupFeeCents: 35000,
    monthlyPriceCents: 3900,
    usageCapLabel: null,
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
    setupFeeCents: null,
    monthlyPriceCents: 9900,
    usageCapLabel: null,
    configFields: [],
    sortOrder: 16,
  },
];
