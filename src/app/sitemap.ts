import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { sortOrder: "asc" },
  });

  // L'accueil expose le catalogue : il change quand une solution change.
  // Les pages sans date reelle n'en portent pas — les moteurs ignorent un
  // `lastmod` qu'ils jugent peu fiable, mieux vaut se taire que l'inventer.
  const catalogUpdatedAt = services.reduce<Date | undefined>(
    (latest, service) =>
      latest && latest >= service.updatedAt ? latest : service.updatedAt,
    undefined
  );

  return [
    {
      url: absoluteUrl("/"),
      lastModified: catalogUpdatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...services.map((service) => ({
      url: absoluteUrl(`/prestations/${service.slug}`),
      lastModified: service.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["/cgv", "/mentions-legales", "/confidentialite", "/cookies"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
