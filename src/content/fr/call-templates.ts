// Modèles de textes par secteur d'activité, proposés dans les réglages des
// solutions téléphoniques (« Partir d'un modèle »). Ils disent à l'assistant
// quoi demander, quoi noter et quoi éviter ; ils ne fixent aucune règle
// commerciale (délai, tarif, politique) que l'entreprise n'aurait pas choisie.
// « {entreprise} » est remplacé par le nom de l'organisation.
//
// - L'accueil sert au standard téléphonique : il présente le commerce, puis
//   l'assistant comme « assistant virtuel » (on dit à l'appelant qu'il parle à
//   une IA), sans promettre de rendez-vous que le standard ne prend pas.
// - Les consignes ne répètent pas cette présentation : l'assistant la fait
//   déjà de lui-même (src/lib/voice-agent/prompt.ts).

export type CallTemplate = {
  id: string;
  sector: string;
  greeting: string;
  instructions: string;
};

function instructions(sections: { ask: string[]; note: string[]; avoid: string[] }): string {
  const block = (title: string, items: string[]) => [title, ...items.map((item) => `- ${item}`)].join("\n");
  return [
    block("Questions à poser :", sections.ask),
    block("À noter :", sections.note),
    block("À éviter :", sections.avoid),
  ].join("\n\n");
}

export const CALL_TEMPLATES: CallTemplate[] = [
  {
    id: "plomberie",
    sector: "Plomberie, chauffage",
    greeting:
      "Bonjour, vous êtes bien chez {entreprise}, plomberie et chauffage. Je suis l'assistant virtuel de l'entreprise. Que puis-je faire pour vous ?",
    instructions: instructions({
      ask: [
        "S'agit-il d'une urgence : fuite, dégât des eaux ou panne de chauffage ?",
        "Pour un devis : quel type de travaux, et dans quelle commune ?",
      ],
      note: [
        "En cas d'urgence : l'adresse complète et un numéro où rappeler.",
        "Pour un devis : les disponibilités de la personne pour une visite.",
      ],
      avoid: [
        "Annoncer un prix ou un délai d'intervention.",
        "Donner des conseils de réparation.",
      ],
    }),
  },
  {
    id: "electricite",
    sector: "Électricité",
    greeting:
      "Bonjour, vous êtes bien chez {entreprise}, électricité générale. Je suis l'assistant virtuel de l'entreprise. Que puis-je faire pour vous ?",
    instructions: instructions({
      ask: [
        "Y a-t-il une coupure totale, des étincelles ou une odeur de brûlé ?",
        "Pour des travaux : quelle installation, et dans quelle commune ?",
      ],
      note: [
        "En cas de danger : l'adresse et un numéro où rappeler en priorité.",
        "Pour des travaux : les disponibilités de la personne.",
      ],
      avoid: [
        "Guider la personne pour intervenir elle-même sur le tableau électrique.",
        "Annoncer un prix ou un délai.",
      ],
    }),
  },
  {
    id: "coiffure",
    sector: "Coiffure, esthétique",
    greeting:
      "Bonjour, bienvenue chez {entreprise}. Je suis l'assistant virtuel du salon. Que puis-je faire pour vous ?",
    instructions: instructions({
      ask: [
        "Quelle prestation souhaitez-vous ?",
        "Avez-vous une préférence pour un collaborateur du salon ?",
      ],
      note: [
        "Le prénom, le nom et un numéro de téléphone.",
        "Pour une couleur ou une première visite : la longueur des cheveux.",
      ],
      avoid: [
        "Annoncer un prix qui ne figure pas dans les réglages.",
        "Promettre un créneau sans l'avoir vérifié.",
      ],
    }),
  },
  {
    id: "restauration",
    sector: "Restauration",
    greeting:
      "Bonjour, bienvenue chez {entreprise}. Je suis l'assistant virtuel du restaurant. Que puis-je faire pour vous ?",
    instructions: instructions({
      ask: [
        "S'agit-il d'une réservation ou d'une commande ?",
        "Pour une réservation : combien de personnes, quel jour et à quelle heure ?",
        "Pour une commande : retrait ou livraison, et pour quelle heure ?",
      ],
      note: [
        "Les allergies ou régimes signalés.",
        "Le nom et un numéro de téléphone.",
      ],
      avoid: [
        "Proposer un plat absent de la carte.",
        "Confirmer une réservation de groupe sans l'accord du restaurant : prendre un message.",
      ],
    }),
  },
  {
    id: "coaching",
    sector: "Coaching, thérapie",
    greeting:
      "Bonjour, vous êtes bien chez {entreprise}. Je suis l'assistant virtuel du cabinet. Comment puis-je vous aider ?",
    instructions: instructions({
      ask: [
        "Est-ce un premier rendez-vous, ou êtes-vous déjà suivi ?",
        "En une phrase, que recherchez-vous ?",
      ],
      note: [
        "Le besoin exprimé, avec les mots de la personne.",
        "Le nom et un numéro où rappeler.",
      ],
      avoid: [
        "Donner un conseil ou un avis sur la situation de la personne.",
        "Poser des questions intimes : le premier échange se fait avec le praticien.",
      ],
    }),
  },
  {
    id: "cabinet",
    sector: "Cabinet (avocat, expertise comptable)",
    greeting:
      "Bonjour, cabinet {entreprise}. Je suis l'assistant virtuel du cabinet. Comment puis-je vous aider ?",
    instructions: instructions({
      ask: [
        "Êtes-vous déjà client du cabinet ?",
        "Quel est le domaine de votre demande ?",
        "Y a-t-il une échéance proche ?",
      ],
      note: [
        "Le nom, la société s'il y en a une, et un numéro où rappeler.",
        "L'échéance éventuelle, avec sa date.",
      ],
      avoid: [
        "Donner un avis juridique, fiscal ou comptable.",
        "Commenter un dossier en cours.",
      ],
    }),
  },
  {
    id: "garage",
    sector: "Garage automobile",
    greeting:
      "Bonjour, garage {entreprise}. Je suis l'assistant virtuel du garage. Que puis-je faire pour vous ?",
    instructions: instructions({
      ask: [
        "Quel est le motif : entretien, panne, pneus ou contrôle technique ?",
        "Quels sont la marque et le modèle du véhicule ?",
        "Pour une panne : le véhicule roule-t-il encore, et où se trouve-t-il ?",
      ],
      note: [
        "L'immatriculation du véhicule.",
        "Le nom et un numéro de téléphone.",
      ],
      avoid: [
        "Faire un diagnostic au téléphone.",
        "Annoncer un prix ou un délai de réparation.",
      ],
    }),
  },
  {
    id: "immobilier",
    sector: "Immobilier",
    greeting:
      "Bonjour, agence {entreprise}. Je suis l'assistant virtuel de l'agence. Comment puis-je vous aider ?",
    instructions: instructions({
      ask: [
        "S'agit-il d'un achat, d'une vente, d'une location ou d'une estimation ?",
        "Pour une visite : quelle est la référence ou l'adresse du bien ?",
      ],
      note: [
        "Pour une estimation : l'adresse et le type de bien.",
        "Le nom et un numéro de téléphone.",
      ],
      avoid: [
        "Annoncer un prix de vente ou une estimation.",
        "Confirmer qu'un bien est encore disponible.",
      ],
    }),
  },
];

// Champs de texte qui proposent un modèle, et la partie du modèle à y mettre.
export const TEMPLATE_FIELDS: Record<string, keyof Pick<CallTemplate, "greeting" | "instructions">> = {
  greetingMessage: "greeting",
  callInstructions: "instructions",
};

// Motifs d'appel courants, proposés en un clic dans les redirections.
export const COMMON_CALL_REASONS = ["Urgence", "Devis", "Rendez-vous", "Facturation", "Réclamation"];

export function fillTemplate(text: string, companyName: string | undefined): string {
  return text.replaceAll("{entreprise}", companyName?.trim() || "notre entreprise");
}
