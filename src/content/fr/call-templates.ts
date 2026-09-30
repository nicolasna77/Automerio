// Modèles de textes par secteur d'activité, proposés dans les réglages des
// solutions téléphoniques. Ils disent à l'assistant quoi demander et quoi
// noter ; ils ne fixent aucune règle commerciale (délai, tarif, politique)
// que l'entreprise n'aurait pas choisie. « {entreprise} » est remplacé par le
// nom de l'organisation. Chaque accueil présente le commerce, puis
// l'assistant comme « assistant virtuel » : on dit à l'appelant qu'il parle à
// une IA (règlement européen sur l'IA, article 50).

export type CallTemplate = {
  id: string;
  sector: string;
  greeting: string;
  instructions: string;
};

export const CALL_TEMPLATES: CallTemplate[] = [
  {
    id: "plomberie",
    sector: "Plomberie, chauffage",
    greeting: "Bonjour, vous êtes bien chez {entreprise}, plomberie et chauffage. Je suis l'assistant virtuel de l'entreprise : je prends votre demande. Que puis-je faire pour vous ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander d'abord s'il s'agit d'une urgence : fuite, dégât des eaux ou panne de chauffage. En cas d'urgence, noter l'adresse complète et un numéro où rappeler. Pour un devis, noter le type de travaux, la commune et les disponibilités de la personne.",
  },
  {
    id: "electricite",
    sector: "Électricité",
    greeting: "Bonjour, vous êtes bien chez {entreprise}, électricité générale. Je suis l'assistant virtuel de l'entreprise : je prends votre demande. Que puis-je faire pour vous ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander s'il y a une coupure totale, des étincelles ou une odeur de brûlé. Dans ce cas, noter l'adresse et un numéro où rappeler en priorité. Pour des travaux, noter la nature du chantier, la commune et les disponibilités de la personne.",
  },
  {
    id: "coiffure",
    sector: "Coiffure, esthétique",
    greeting: "Bonjour, bienvenue chez {entreprise}. Je suis l'assistant virtuel du salon : je peux prendre votre rendez-vous. Que souhaitez-vous ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander la prestation souhaitée et, s'il y a plusieurs collaborateurs, une préférence éventuelle. Pour une première visite, noter le prénom et un numéro de téléphone. Ne pas annoncer de prix qui ne figure pas dans les réglages.",
  },
  {
    id: "restauration",
    sector: "Restauration",
    greeting: "Bonjour, bienvenue chez {entreprise}. Je suis l'assistant virtuel du restaurant : je prends les réservations et les commandes. Que puis-je faire pour vous ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander s'il s'agit d'une réservation ou d'une commande à emporter. Pour une réservation : nombre de personnes, date, heure et allergies éventuelles. Pour une commande : les plats, l'heure de retrait et un numéro de téléphone.",
  },
  {
    id: "coaching",
    sector: "Coaching, thérapie",
    greeting: "Bonjour, vous êtes bien chez {entreprise}. Je suis l'assistant virtuel du cabinet : je peux organiser un rendez-vous. Comment puis-je vous aider ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander s'il s'agit d'un premier rendez-vous. Si oui, noter en une phrase ce que la personne recherche. Ne donner aucun conseil ni avis sur sa situation : proposer un rendez-vous ou un rappel.",
  },
  {
    id: "cabinet",
    sector: "Cabinet (avocat, expertise comptable)",
    greeting: "Bonjour, cabinet {entreprise}. Je suis l'assistant virtuel du cabinet : je prends votre demande et organise un rendez-vous si besoin. Comment puis-je vous aider ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander le domaine de la demande et si la personne est déjà cliente du cabinet. Ne donner aucun avis juridique ou comptable. Noter les coordonnées et proposer un rendez-vous ou un rappel.",
  },
  {
    id: "garage",
    sector: "Garage automobile",
    greeting: "Bonjour, garage {entreprise}. Je suis l'assistant virtuel du garage : je prends votre demande ou votre rendez-vous. Que puis-je faire pour vous ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander la marque, le modèle et l'immatriculation du véhicule, puis le motif : entretien, panne, pneus ou contrôle. Pour une panne, demander si le véhicule roule encore et où il se trouve.",
  },
  {
    id: "immobilier",
    sector: "Immobilier",
    greeting: "Bonjour, agence {entreprise}. Je suis l'assistant virtuel de l'agence : je prends votre demande. Comment puis-je vous aider ?",
    instructions:
      "Au début de l'appel, présenter {entreprise} et son activité en une phrase, puis se présenter comme son assistant virtuel. Demander s'il s'agit d'un achat, d'une vente, d'une location ou d'une estimation. Pour une visite, noter la référence ou l'adresse du bien. Pour une estimation, noter l'adresse et le type de bien.",
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
