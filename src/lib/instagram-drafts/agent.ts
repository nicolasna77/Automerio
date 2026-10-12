import type { InstagramDraftKind } from "@prisma/client";
import { getOpenAIClient } from "@/lib/openai";
import {
  cleanHashtags,
  DRAFT_GOALS,
  HASHTAG_TIERS,
  PLAN_FORMATS,
  type DraftContent,
  type DraftGoal,
} from "./content";

// Consignes adaptées en français des skills « instagram-skills »
// (ig-caption-writer, ig-carousel-planner, ig-hashtag-strategist,
// ig-content-planner et references/voice-rules.md) :
// https://github.com/sergebulaev/instagram-skills
// Copyright (c) 2026 Sergey Bulaev. Licence MIT : l'autorisation est donnée
// d'utiliser, copier, modifier et distribuer ce contenu, à condition de
// reproduire cet avis de copyright. Le contenu est fourni « tel quel », sans
// garantie d'aucune sorte.

const DRAFT_MODEL = "gpt-5-mini";

export type DraftBrief = {
  kind: InstagramDraftKind;
  subject: string;
  goal: DraftGoal | null;
  details: string | null;
  business: { name: string; instagramUsername: string | null; faq: string | null };
};

const GOAL_LABELS: Record<DraftGoal, string> = {
  saves: "être enregistrée (la personne la garde pour plus tard)",
  shares: "être partagée en message privé à quelqu'un",
  comments: "faire réagir en commentaire",
  follows: "gagner des abonnés",
};

const VOICE_RULES = `Règles d'écriture, pour tout le texte :
- Français naturel, celui d'un artisan ou d'un commerçant qui parle de son métier. Vouvoiement du lecteur, sauf si les précisions du client demandent le tutoiement.
- Une seule idée par publication.
- Des lignes courtes, une ligne vide entre deux idées : on lit sur un téléphone.
- Pas plus d'un tiret long par publication ; préfère la virgule, les deux-points ou le retour à la ligne.
- Zéro à trois emoji, placés avec intention, jamais en pluie.
- Les noms de personnes, d'entreprises et de produits gardent leur majuscule.
- Pas de vente forcée : on apprend quelque chose ou on raconte, puis on indique la suite une seule fois.
- Mots et tournures interdits : « dans un monde où », « à l'ère du numérique », « et si je vous disais », « le résultat ? », « parlons de », « voici la vérité », « soyons honnêtes », « game changer », « incontournable », « révolutionner », « booster », « transformer », « passer au niveau supérieur », « plongeons ».
- Pas d'accumulation en trois temps sans contenu (« Pas de X. Pas de Y. Juste Z. »), pas de ligne d'un mot ajoutée pour l'effet.
- Pas d'appât à interaction (« commentez OUI », « double tapez si »), pas de « qu'en pensez-vous ? » en conclusion.`;

const NO_INVENTION = `Interdiction absolue d'inventer un fait. Aucun chiffre, aucune date, aucun prix, aucun nom de client, aucun résultat, aucun avis, aucune récompense qui ne figure pas dans le sujet, les précisions ou la présentation de l'entreprise. Si un passage appelle un chiffre que le client n'a pas donné, écris la phrase sans chiffre. Un chiffre inventé publié oblige à se rétracter ; une phrase sans chiffre est seulement un peu moins forte.`;

const HASHTAG_RULES = `Hashtags : de 3 à 5, jamais plus. Ils servent d'étiquettes de sujet, pas de volume. 2 ou 3 hashtags de niche (précis, peu utilisés, souvent métier et ville ou métier et spécialité), 1 ou 2 intermédiaires, 0 ou 1 très large. Chacun décrit le contenu réel de la publication. Jamais de #follow4follow, #like4like ni de hashtag sans rapport pour toucher plus de monde. En minuscules.`;

const KIND_RULES: Record<InstagramDraftKind, string> = {
  CAPTION: `Tu rédiges la légende d'une publication (une photo ou une vidéo Reel).
- Instagram coupe la légende après environ 125 caractères derrière « plus » : l'accroche (hook) tient en moins de 125 caractères, se comprend seule et donne envie de lire la suite.
- Accroche selon l'objectif : pour être enregistrée, un résultat concret et la promesse d'une méthode à garder ; pour être partagée, une idée reçue du métier, corrigée par une affirmation nette et défendable ; pour les commentaires, un moment précis que le lecteur a vécu, sans introduction ; pour les abonnés, une courte histoire vécue à la première personne.
- Le corps (body) tient la promesse de l'accroche : des lignes courtes, une ligne vide entre deux idées, 1 500 caractères au plus.
- Un seul appel à l'action (cta) : une invitation précise à enregistrer, à envoyer à quelqu'un, une vraie question, ou une seule étape suivante.
${HASHTAG_RULES}`,
  CAROUSEL: `Tu prépares un carrousel, diapositive par diapositive, de 4 à 10 diapositives, sans remplissage pour atteindre un nombre rond.
- Diapositive 1 : la promesse et une boucle ouverte, une annonce qui ne se résout qu'en faisant glisser (par exemple, signaler qu'un des points est souvent oublié, sans dire lequel), jamais un simple titre. Formule-la avec tes mots, adaptée au sujet.
- Diapositives 2 et 3 : le meilleur du contenu, tout de suite ; on ne garde pas le meilleur point pour la fin.
- Diapositives suivantes : un point par diapositive, lisible en deux secondes sur un téléphone (titre de 8 mots au plus, texte de 25 mots au plus).
- Dernière diapositive : un récapitulatif qui mérite d'être enregistré à lui seul, et une seule demande (enregistrer ou s'abonner).
- Formes possibles : liste numérotée de conseils, avant/après avec les étapes entre les deux, idées reçues corrigées, méthode à reprendre telle quelle.
- La légende (caption) est courte : elle reprend l'accroche, présente le carrousel et porte les hashtags.
${HASHTAG_RULES}`,
  HASHTAGS: `Tu choisis les hashtags d'une publication.
${HASHTAG_RULES}
- Pour chacun, indique son niveau (niche, mid pour intermédiaire, broad pour très large) et sa raison, en une phrase courte.`,
  WEEKLY_PLAN: `Tu prépares le planning Instagram d'une semaine, du lundi au dimanche, une ligne par jour (day : le nom du jour).
- Formats : reel (vidéo courte, pour toucher de nouvelles personnes), carousel (pour être enregistré), image (photo seule), stories (pour le lien avec les abonnés).
- Au moins 2 reels et 2 carrousels dans la semaine ; 4 ou 5 publications au total, les autres jours en stories.
- Répartition : environ 40 % conseils et savoir-faire, 30 % coulisses et histoires vécues, 20 % échange avec la communauté, 10 % mise en avant de l'offre (une ou deux fois au plus).
- Objectifs variés : au moins 3 publications à enregistrer, 2 à partager, 1 pour les commentaires, 1 pour les abonnés.
- Pour chaque jour : l'angle en une phrase, sans répéter le format, l'accroche proposée, l'objectif et une heure de publication (heure de Paris, au format 12:00 ; en semaine plutôt entre 11 h et 13 h ou entre 19 h et 21 h, le dimanche en soirée).
- Termine par le rythme des stories (stories), en deux phrases : 2 à 4 par jour, coulisses, un sondage ou une question, et le partage d'une publication récente.`,
};

function describeBusiness(business: DraftBrief["business"]): string {
  return [
    `Entreprise : ${business.name}.`,
    business.instagramUsername ? `Compte Instagram : ${business.instagramUsername}.` : null,
    business.faq ? `Ce que l'entreprise dit d'elle-même (questions fréquentes) :\n${business.faq.slice(0, 3000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDraftPrompt(brief: DraftBrief): string {
  return [
    `Tu aides une petite entreprise française (artisan, commerçant, coach ou indépendant) à préparer ses publications Instagram. Tu rédiges un brouillon qu'elle relira, complétera avec sa photo ou sa vidéo, puis publiera elle-même.`,
    KIND_RULES[brief.kind],
    VOICE_RULES,
    describeBusiness(brief.business),
    NO_INVENTION,
  ].join("\n\n");
}

export function buildUserMessage(brief: DraftBrief): string {
  return [
    `Sujet : ${brief.subject}`,
    brief.goal ? `Objectif : ${GOAL_LABELS[brief.goal]}` : null,
    brief.details ? `Précisions du client (les seuls faits utilisables) :\n${brief.details}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const STRING = { type: "string" } as const;
const HASHTAGS = { type: "array", items: STRING } as const;

const SCHEMAS: Record<InstagramDraftKind, Record<string, unknown>> = {
  CAPTION: {
    type: "object",
    additionalProperties: false,
    required: ["hook", "body", "cta", "hashtags"],
    properties: { hook: STRING, body: STRING, cta: STRING, hashtags: HASHTAGS },
  },
  CAROUSEL: {
    type: "object",
    additionalProperties: false,
    required: ["slides", "caption", "hashtags"],
    properties: {
      slides: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "text"],
          properties: { title: STRING, text: STRING },
        },
      },
      caption: STRING,
      hashtags: HASHTAGS,
    },
  },
  HASHTAGS: {
    type: "object",
    additionalProperties: false,
    required: ["tags"],
    properties: {
      tags: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tag", "tier", "why"],
          properties: { tag: STRING, tier: { type: "string", enum: HASHTAG_TIERS }, why: STRING },
        },
      },
    },
  },
  WEEKLY_PLAN: {
    type: "object",
    additionalProperties: false,
    required: ["days", "stories"],
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["day", "format", "angle", "hook", "goal", "time"],
          properties: {
            day: STRING,
            format: { type: "string", enum: PLAN_FORMATS },
            angle: STRING,
            hook: STRING,
            goal: { type: "string", enum: DRAFT_GOALS },
            time: STRING,
          },
        },
      },
      stories: STRING,
    },
  },
};

type ContentOf<K extends InstagramDraftKind> = Extract<DraftContent, { kind: K }>["content"];

// Le schéma strict garantit la forme ; on borne encore les tailles (10
// diapositives, 5 hashtags, 7 jours) et on nettoie les hashtags.
export function normalizeDraft(kind: InstagramDraftKind, raw: unknown): DraftContent {
  switch (kind) {
    case "CAPTION": {
      const c = raw as ContentOf<"CAPTION">;
      return { kind, content: { hook: c.hook, body: c.body, cta: c.cta, hashtags: cleanHashtags(c.hashtags) } };
    }
    case "CAROUSEL": {
      const c = raw as ContentOf<"CAROUSEL">;
      return { kind, content: { slides: c.slides.slice(0, 10), caption: c.caption, hashtags: cleanHashtags(c.hashtags) } };
    }
    case "HASHTAGS": {
      const c = raw as ContentOf<"HASHTAGS">;
      const seen = new Set<string>();
      const tags = c.tags.flatMap((t) => {
        const tag = cleanHashtags([t.tag])[0];
        if (!tag || seen.has(tag)) return [];
        seen.add(tag);
        return [{ ...t, tag }];
      });
      return { kind, content: { tags: tags.slice(0, 5) } };
    }
    case "WEEKLY_PLAN": {
      const c = raw as ContentOf<"WEEKLY_PLAN">;
      return { kind, content: { days: c.days.slice(0, 7), stories: c.stories } };
    }
  }
}

export async function generateInstagramDraft(brief: DraftBrief): Promise<DraftContent> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: DRAFT_MODEL,
    messages: [
      { role: "system", content: buildDraftPrompt(brief) },
      { role: "user", content: buildUserMessage(brief) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "brouillon", strict: true, schema: SCHEMAS[brief.kind] },
    },
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("[instagram-drafts] réponse vide du modèle");
  return normalizeDraft(brief.kind, JSON.parse(raw));
}
