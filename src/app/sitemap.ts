import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isWaitlistMode()) {
    return ["/", "/terms", "/legal-notice", "/privacy", "/cookies"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === "/" ? "weekly" : "yearly",
      priority: path === "/" ? 1 : 0.2,
    }));
  }
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { sortOrder: "asc" },
  });

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
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: service.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["/terms", "/legal-notice", "/privacy", "/cookies"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
