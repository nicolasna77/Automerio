export const SITE_NAME = "Automerio";

export const SITE_NAV_LINKS = [
  { href: "/#method", key: "method" },
  { href: "/#who-its-for", key: "audience" },
  { href: "/#services", key: "pricing" },
  { href: "/#faq", key: "faq" },
] as const;

export const FAQ_KEYS = [
  "keepNumber",
  "setup",
  "delay",
  "notUnderstood",
  "takeOver",
  "hours",
  "editAnswers",
  "ai",
  "tools",
  "cancel",
  "data",
] as const;

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type Faq = { question: string; answer: string };
