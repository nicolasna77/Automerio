export const SITE_NAME = "Automerio";

export const SITE_NAV_LINKS = [
  { href: "/#methode", label: "Notre méthode" },
  { href: "/contact", label: "Contact" },
];

export const SITE_DESCRIPTION =
  "Automerio installe des automatisations IA clé-en-main pour artisans, coachs, indépendants et TPE/PME : standard téléphonique, assistants de messagerie, documents administratifs. L'équipe installe, connecte et surveille — aucune compétence technique requise.";

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "Dois-je savoir configurer un outil ou une API ?",
    answer:
      "Non. Notre équipe installe, connecte et vérifie chaque automatisation à votre place. Vous n'ouvrez aucun logiciel technique.",
  },
  {
    question: "Combien de temps avant que ce soit actif ?",
    answer:
      "La plupart des solutions sont déployées et vérifiées en quelques jours après l'audit initial.",
  },
  {
    question: "Je peux arrêter quand je veux ?",
    answer:
      "Oui, aucun engagement de durée. Et votre abonnement est remboursé si vous n'êtes pas satisfait dans les 30 premiers jours. Les frais de mise en place restent dus une fois la solution installée et active.",
  },
  {
    question: "Et si j'ai déjà un agenda ou un outil de facturation ?",
    answer:
      "Nous connectons vos automatisations à vos outils existants plutôt que de vous en imposer de nouveaux.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Vos données restent liées à vos outils existants. Nous ne les revendons ni ne les partageons avec des tiers.",
  },
];
