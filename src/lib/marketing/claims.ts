type ClaimRule = {
  pattern: RegExp;
  message: string;
};

const RULES: ClaimRule[] = [
  {
    pattern: /\d+(?:[.,]\d+)?\s*%/,
    message: "contient un pourcentage : aucun chiffre de résultat n'est mesuré à ce jour",
  },
  {
    pattern:
      /\b(?:\d+(?:[.,]\d+)?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|cent|mille)\s*fois\s+(?:plus|moins|mieux)\b/i,
    message: "annonce un facteur de progression invérifiable",
  },
  {
    pattern:
      /\b\d+\s*(?:\+\s*)?(?:clients?|entreprises?|artisans?|utilisateurs?|professionnels?|abonnés?)\b/i,
    message: "avance un nombre de clients qui n'est pas vérifiable",
  },
  {
    pattern: /[»"”]\s*[—–-]\s*[A-ZÀ-Ý]/,
    message: "cite une personne nommée : aucun témoignage n'a été recueilli",
  },
  {
    pattern: /[«"“][^»"”]{120,}[»"”]/,
    message: "contient une longue citation : vérifiez qu'elle n'est attribuée à personne",
  },
  {
    pattern: /\b(?:n°\s*1|numéro\s+un|leader\s+(?:du|de|français)|le\s+meilleur\b)/i,
    message: "revendique une position de marché non établie",
  },
  {
    pattern: /\b(?:certifié|agréé|primé|récompensé)\b/i,
    message: "évoque une certification ou une récompense : aucune n'existe",
  },
];

export function detectUnsupportedClaims(body: string): string[] {
  return RULES.filter((rule) => rule.pattern.test(body)).map((rule) => rule.message);
}
