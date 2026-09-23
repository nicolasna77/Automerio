import { cache } from "react";
import type { Service } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConfigField, ServiceDTO } from "@/lib/catalog";
import { readUsageCap } from "@/lib/usage-cap";
import { readSubscriptionTier } from "@/lib/subscription-pricing";

export function toServiceDTO(service: Service): ServiceDTO {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    category: service.category,
    setupFeeCents: service.setupFeeCents,
    monthlyPriceCents: service.monthlyPriceCents,
    usageCap: readUsageCap(service),
    tier: readSubscriptionTier(service),
    configFields: (service.configFields as ConfigField[]) ?? [],
    sortOrder: service.sortOrder,
  };
}

export const getCatalog = cache(async (): Promise<ServiceDTO[]> => {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return services.map(toServiceDTO);
});

export async function getServiceBySlug(slug: string): Promise<ServiceDTO | null> {
  const service = await db.service.findFirst({ where: { slug, isActive: true } });
  return service ? toServiceDTO(service) : null;
}
