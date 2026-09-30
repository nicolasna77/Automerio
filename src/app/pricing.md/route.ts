import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";
import { REFUND_GUARANTEE_DAYS } from "@/lib/legal";
import { formatDate, type ServiceCategory } from "@/lib/catalog";
import { publicServiceUrl } from "@/lib/public-links";
import { formatCentsWithVat, VAT_PERCENTAGE } from "@/lib/vat";
import { formatPerUnit, formatUsageUnits, readUsageCap } from "@/lib/usage-cap";

export const dynamic = "force-dynamic";

// Les tarifs en Markdown, pour les agents IA qui comparent des offres : lus
// dans la table Service comme le site, ils ne peuvent pas diverger des pages.
export async function GET() {
  const tCatalog = await getTranslations({ locale: routing.defaultLocale, namespace: "Catalog" });
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const updatedAt = services.reduce(
    (latest, service) => (service.updatedAt > latest ? service.updatedAt : latest),
    new Date(0)
  );

  const lines = [
    `# Tarifs ${SITE_NAME}`,
    "",
    `> Prix en euros, TVA ${VAT_PERCENTAGE} % incluse, le hors taxes entre parenthèses. Abonnement mensuel sans engagement de durée, sans frais de mise en place. Remboursement sur simple demande dans les ${REFUND_GUARANTEE_DAYS} jours suivant le premier paiement.`,
    "",
    `Dernière mise à jour : ${formatDate(updatedAt)}.`,
    "",
  ];

  let currentCategory: ServiceCategory | null = null;
  for (const service of services) {
    if (service.category !== currentCategory) {
      currentCategory = service.category;
      lines.push(`## ${tCatalog(`categories.${service.category}`)}`, "");
    }

    lines.push(`### ${service.name}`, "", service.description, "");
    lines.push(
      service.monthlyPriceCents === null
        ? "- Abonnement : tarif sur demande"
        : `- Abonnement : ${formatCentsWithVat(service.monthlyPriceCents)} par mois`
    );

    const cap = readUsageCap(service);
    if (cap) {
      lines.push(`- Inclus chaque mois : ${formatUsageUnits(cap.includedUnits, cap.unit)}`);
      if (cap.overageUnitPriceCents > 0) {
        lines.push(`- Au-delà : ${formatPerUnit(cap.overageUnitPriceCents, cap.unit)}`);
      }
      if (service.maxUsageUnits !== null && service.extraUnitPriceCents !== null) {
        lines.push(
          `- Volume ajustable jusqu'à ${formatUsageUnits(service.maxUsageUnits, cap.unit)} par mois, à ${formatPerUnit(service.extraUnitPriceCents, cap.unit)} pour le volume ajouté à l'avance`
        );
      }
    }
    lines.push(`- Détail : ${publicServiceUrl(service.slug)}`, "");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
