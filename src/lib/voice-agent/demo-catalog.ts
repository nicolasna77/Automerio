import { db } from "@/lib/db";
import { formatCentsWithVat } from "@/lib/vat";
import { usageCapLabelOf } from "@/lib/usage-cap";
import type { DemoCatalogEntry } from "./demo-prompt";

function describePrice(monthlyPriceCents: number | null): string {
  return monthlyPriceCents !== null
    ? `${formatCentsWithVat(monthlyPriceCents)} par mois, sans frais de mise en place`
    : "tarif sur demande";
}

export async function loadDemoCatalog(): Promise<DemoCatalogEntry[]> {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  return services.map((service) => ({
    name: service.name,
    description: service.description,
    price: describePrice(service.monthlyPriceCents),
    usage: usageCapLabelOf(service),
  }));
}
