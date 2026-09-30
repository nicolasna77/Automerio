export const SITE_NAME = "Automerio";

export const SITE_NAV_LINKS = [
  { href: "/#method", key: "method" },
  { href: "/contact", key: "contact" },
] as const;

export const FAQ_KEYS = ["setup", "delay", "ai", "cancel", "tools", "data"] as const;

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type Faq = { question: string; answer: string };
