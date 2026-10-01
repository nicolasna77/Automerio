import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { getTrades, tradePath } from "@/lib/trades";

export const dynamic = "force-dynamic";

const LEGAL_PATHS = ["/terms", "/legal-notice", "/privacy", "/cookies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { sortOrder: "asc" },
  });

  // La page d'accueil présente le catalogue : elle change avec lui.
  const catalogUpdatedAt = services.reduce<Date | undefined>(
    (latest, service) =>
      latest && latest >= service.updatedAt ? latest : service.updatedAt,
    undefined
  );

  const home = {
    url: absoluteUrl("/"),
    lastModified: catalogUpdatedAt,
    changeFrequency: "weekly" as const,
    priority: 1,
  };
  const legal = LEGAL_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: LEGAL_LAST_UPDATED,
    changeFrequency: "yearly" as const,
    priority: 0.2,
  }));

  // Pages par métier : ouvertes même en mode présentation.
  const trades = getTrades().map((trade) => ({
    url: absoluteUrl(tradePath(trade.slug)),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // En mode présentation, seules l'accueil, les pages par métier et les pages
  // légales sont ouvertes.
  if (isWaitlistMode()) return [home, ...trades, ...legal];

  return [
    home,
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...services.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: service.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...trades,
    ...legal,
  ];
}
