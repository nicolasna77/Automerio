import { TRADES as FR } from "@/content/fr/trades";
import type { Faq } from "@/lib/site";

export type TradeCallTurn = { speaker: "caller" | "assistant"; text: string };

export type Trade = {
  slug: string;
  // Nom court, pour les liens et le fil d'Ariane.
  name: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  lead: string;
  // Les métiers concernés, en une ligne.
  trades: string;
  pains: { title: string; description: string }[];
  // Un appel type, avec une entreprise fictive.
  call: { company: string; turns: TradeCallTurn[]; result: string };
  // Solutions utiles pour ce métier ; seules les solutions actives du
  // catalogue s'affichent.
  solutions: { slug: string; why: string }[];
  faq: Faq[];
};

export const TRADE_PATH_PREFIX = "/pour";

export function tradePath(slug: string): string {
  return `${TRADE_PATH_PREFIX}/${slug}`;
}

export function getTrades(): Trade[] {
  return FR;
}

export function getTrade(slug: string): Trade | null {
  return FR.find((trade) => trade.slug === slug) ?? null;
}
