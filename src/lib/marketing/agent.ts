import OpenAI from "openai";
import type { MarketingChannel } from "@prisma/client";
import { formatCents, type ServiceDTO } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import { channelRule } from "./channels";
import { detectUnsupportedClaims } from "./claims";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const COPY_MODEL = "gpt-5.5";

export type PostProposal = {
  angle: string;
  body: string;
  serviceSlug: string | null;
  imageBrief: string | null;
  warnings: string[];
};

function describeCatalog(services: ServiceDTO[]): string {
  return services
    .map((service) => {
      const price =
        service.monthlyPriceCents !== null
          ? `${formatCents(service.monthlyPriceCents)} par mois`
          : service.setupFeeCents !== null
            ? `${formatCents(service.setupFeeCents)} à l'installation`
            : "tarif non précisé";
      const cap = service.usageCap ? ` (${formatUsageCap(service.usageCap)})` : "";
      return `- ${service.name} [${service.slug}] — ${service.description} Tarif : ${price}${cap}.`;
    })
    .join("\n");
}

export function buildMarketingPrompt(options: {
  channel: MarketingChannel;
  services: ServiceDTO[];
  recentAngles: string[];
  count: number;
}): string {
  const rule = channelRule(options.channel);
  const sections = [
    `Tu écris pour Automerio, une agence française qui installe des automatisations IA clé-en-main chez des artisans, des coachs, des indépendants et des TPE/PME. Automerio ne vend pas un logiciel à paramétrer : l'équipe installe, connecte et surveille. C'est ce qui la distingue, et c'est le seul argument dont tu disposes.`,

    `Tu prépares ${options.count} proposition(s) de publication pour ${rule.label}, où l'on s'adresse à ${rule.audience}.`,

    `Écriture pour ce réseau :\n${rule.guidance.map((g) => `- ${g}`).join("\n")}\n- Vise environ ${rule.targetChars} caractères, sans jamais dépasser ${rule.maxChars}.`,

    `Le catalogue réel, et la totalité des faits dont tu disposes :\n${describeCatalog(options.services)}`,

    `Interdiction absolue d'inventer une preuve. Aucun pourcentage, aucun chiffre de résultat, aucun nombre de clients, aucun témoignage, aucune étude, aucune récompense, aucune position de marché : rien de tout cela n'existe et rien ne peut être vérifié. Tu n'as le droit d'affirmer que ce qui figure ci-dessus. Une publication convaincante et fausse est un échec, pas un succès. Ce qui remplace la preuve chiffrée : une situation que le lecteur reconnaît, décrite avec précision.`,

    `Écris en français, à la deuxième personne du pluriel. Pas de jargon technique, pas de superlatif, pas de « révolutionnaire » ni de « game changer ». Le lecteur est occupé et méfiant : une phrase juste vaut mieux qu'une phrase enthousiaste.`,

    `Chaque proposition part d'un angle différent : une douleur concrète, un moment précis de la journée, une objection courante, une comparaison avec la façon de faire actuelle. Formule cet angle en une phrase, pour qu'on voie d'un coup d'œil ce qui distingue deux propositions.`,
  ];

  if (options.recentAngles.length > 0) {
    sections.push(
      `Angles déjà proposés ces dernières semaines, à ne pas resservir :\n${options.recentAngles
        .map((a) => `- ${a}`)
        .join("\n")}`
    );
  }

  if (rule.needsImage) {
    sections.push(
      `Ce réseau n'accepte pas de publication sans image. Décris dans imageBrief le visuel attendu : une scène concrète et photographiable, pas un concept. Tu ne produis pas l'image, tu la commandes.`
    );
  }

  return sections.join("\n\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posts"],
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["angle", "body", "serviceSlug", "imageBrief"],
        properties: {
          angle: { type: "string" },
          body: { type: "string" },
          serviceSlug: {
            type: ["string", "null"],
            description: "Slug exact d'une solution du catalogue, ou null si la publication porte sur l'offre en général.",
          },
          imageBrief: {
            type: ["string", "null"],
            description: "Visuel attendu, uniquement pour les réseaux qui exigent une image.",
          },
        },
      },
    },
  },
} as const;

export async function generateMarketingPosts(options: {
  channel: MarketingChannel;
  services: ServiceDTO[];
  recentAngles: string[];
  count: number;
}): Promise<PostProposal[]> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: COPY_MODEL,
    messages: [
      { role: "system", content: buildMarketingPrompt(options) },
      {
        role: "user",
        content: `Propose ${options.count} publication(s).`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "propositions", strict: true, schema: RESPONSE_SCHEMA },
    },
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) return [];

  const parsed = JSON.parse(raw) as {
    posts: { angle: string; body: string; serviceSlug: string | null; imageBrief: string | null }[];
  };

  const knownSlugs = new Set(options.services.map((s) => s.slug));

  return parsed.posts.map((post) => ({
    angle: post.angle,
    body: post.body,
    serviceSlug: post.serviceSlug && knownSlugs.has(post.serviceSlug) ? post.serviceSlug : null,
    imageBrief: channelRule(options.channel).needsImage ? post.imageBrief : null,
    warnings: detectUnsupportedClaims(post.body),
  }));
}
