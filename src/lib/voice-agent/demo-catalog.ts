import { db } from "@/lib/db";
import { formatCentsWithVat } from "@/lib/vat";
import { usageCapLabelOf } from "@/lib/usage-cap";
import type { DemoCatalogEntry } from "./demo-prompt";

function describePrice(setupFeeCents: number | null, monthlyPriceCents: number | null): string {
  const parts: string[] = [];
  if (setupFeeCents !== null) parts.push(`${formatCentsWithVat(setupFeeCents)} à l'installation`);
  if (monthlyPriceCents !== null) parts.push(`${formatCentsWithVat(monthlyPriceCents)} par mois`);
  return parts.length > 0 ? parts.join(", puis ") : "tarif sur demande";
}

/** Le catalogue actif, dans les mots que l'agent d'essai prononcera. */
export async function loadDemoCatalog(): Promise<DemoCatalogEntry[]> {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  return services.map((service) => ({
    name: service.name,
    description: service.description,
    price: describePrice(service.setupFeeCents, service.monthlyPriceCents),
    usage: usageCapLabelOf(service),
  }));
}
