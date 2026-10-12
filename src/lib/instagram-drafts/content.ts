import type { ClientServiceStatus, InstagramDraftKind } from "@prisma/client";
import { INSTAGRAM_SERVICE_SLUG } from "@/lib/catalog";

// Contenu d'un brouillon Instagram, tel que le modèle le renvoie (schéma JSON
// strict, voir agent.ts) et tel qu'il est enregistré dans instagram_draft.
// Fichier sans dépendance serveur : la page s'en sert pour afficher et copier.

export const DRAFT_KINDS = ["CAPTION", "CAROUSEL", "HASHTAGS", "WEEKLY_PLAN"] as const satisfies readonly InstagramDraftKind[];

// Objectif d'une légende ou d'un carrousel : le signal qu'Instagram récompense.
export const DRAFT_GOALS = ["saves", "shares", "comments", "follows"] as const;
export type DraftGoal = (typeof DRAFT_GOALS)[number];

export const HASHTAG_TIERS = ["niche", "mid", "broad"] as const;
export const PLAN_FORMATS = ["reel", "carousel", "image", "stories"] as const;

export const SUBJECT_MAX = 300;
export const DETAILS_MAX = 2000;
// Historique gardé par solution ; les plus anciens sont effacés.
export const DRAFTS_KEPT = 20;
export const DRAFTS_PER_DAY = 30;

export type CaptionContent = { hook: string; body: string; cta: string; hashtags: string[] };
export type CarouselContent = { slides: { title: string; text: string }[]; caption: string; hashtags: string[] };
export type HashtagsContent = { tags: { tag: string; tier: (typeof HASHTAG_TIERS)[number]; why: string }[] };
export type PlanDay = {
  day: string;
  format: (typeof PLAN_FORMATS)[number];
  angle: string;
  hook: string;
  goal: DraftGoal;
  time: string;
};
export type WeeklyPlanContent = { days: PlanDay[]; stories: string };

export type DraftContent =
  | { kind: "CAPTION"; content: CaptionContent }
  | { kind: "CAROUSEL"; content: CarouselContent }
  | { kind: "HASHTAGS"; content: HashtagsContent }
  | { kind: "WEEKLY_PLAN"; content: WeeklyPlanContent };

// Solution Instagram payée : en mise en service ou active.
export function canDraftInstagram(item: { status: ClientServiceStatus; service: { slug: string } }): boolean {
  return item.service.slug === INSTAGRAM_SERVICE_SLUG && (item.status === "CONFIGURING" || item.status === "ACTIVE");
}

export function isDraftKind(value: unknown): value is InstagramDraftKind {
  return typeof value === "string" && (DRAFT_KINDS as readonly string[]).includes(value);
}

export function isDraftGoal(value: unknown): value is DraftGoal {
  return typeof value === "string" && (DRAFT_GOALS as readonly string[]).includes(value);
}

export function needsGoal(kind: InstagramDraftKind): boolean {
  return kind === "CAPTION" || kind === "CAROUSEL";
}

// Un hashtag propre : un seul mot, précédé de #, sans ponctuation.
export function cleanHashtag(raw: string): string | null {
  const word = raw.trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
  return word ? `#${word.toLowerCase()}` : null;
}

export function cleanHashtags(raw: string[], max = 5): string[] {
  return [...new Set(raw.map(cleanHashtag).filter((tag): tag is string => tag !== null))].slice(0, max);
}

// Texte prêt à coller dans Instagram. Les libellés (« Diapositive 1 »…) sont
// fournis par l'appelant, qui les tire de messages/*.json.
export function draftToText(
  draft: DraftContent,
  labels: { slide: (n: number) => string; stories: string; day: (d: PlanDay) => string }
): string {
  switch (draft.kind) {
    case "CAPTION": {
      const { hook, body, cta, hashtags } = draft.content;
      return [hook, body, cta, hashtags.join(" ")].filter(Boolean).join("\n\n");
    }
    case "CAROUSEL": {
      const { slides, caption, hashtags } = draft.content;
      const slideText = slides
        .map((slide, i) => [labels.slide(i + 1), slide.title, slide.text].filter(Boolean).join("\n"))
        .join("\n\n");
      return [slideText, caption, hashtags.join(" ")].filter(Boolean).join("\n\n");
    }
    case "HASHTAGS":
      return draft.content.tags.map((t) => t.tag).join(" ");
    case "WEEKLY_PLAN": {
      const { days, stories } = draft.content;
      return [...days.map(labels.day), "", `${labels.stories} ${stories}`].join("\n");
    }
  }
}

// Tout le texte rédigé, pour chercher les chiffres qu'il avance.
function draftWords(draft: DraftContent): string {
  switch (draft.kind) {
    case "CAPTION":
      return [draft.content.hook, draft.content.body, draft.content.cta].join(" ");
    case "CAROUSEL":
      return [...draft.content.slides.flatMap((s) => [s.title, s.text]), draft.content.caption].join(" ");
    case "HASHTAGS":
      return "";
    case "WEEKLY_PLAN":
      // L'heure de publication est une suggestion, pas un fait à vérifier.
      return draft.content.days.map((d) => `${d.angle} ${d.hook}`).join(" ");
  }
}

const NUMBER = /\d+(?:[.,]\d+)?/g;

function numbersIn(text: string): Set<string> {
  return new Set((text.match(NUMBER) ?? []).map((n) => n.replace(",", ".")));
}

// Les consignes interdisent d'inventer un chiffre : tout nombre du brouillon
// absent de ce que le client a écrit est signalé « à vérifier ». Les petits
// entiers (5 conseils, 3 étapes) sont la structure du texte, pas un fait.
export function unsupportedNumbers(draft: DraftContent, sources: string[]): string[] {
  const known = numbersIn(sources.join(" "));
  return [...numbersIn(draftWords(draft))].filter(
    (n) => !known.has(n) && !(/^\d+$/.test(n) && Number(n) <= 10)
  );
}
