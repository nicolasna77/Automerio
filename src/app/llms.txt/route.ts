import { db } from "@/lib/db";
import { absoluteUrl, FAQS, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { CATEGORY_LABELS, formatCents, type ServiceCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const byCategory = new Map<ServiceCategory, typeof services>();
  for (const service of services) {
    const list = byCategory.get(service.category) ?? [];
    list.push(service);
    byCategory.set(service.category, list);
  }

  function price(setupFeeCents: number | null, monthlyPriceCents: number | null): string {
    const parts: string[] = [];
    if (setupFeeCents !== null) parts.push(`${formatCents(setupFeeCents)} à l'installation`);
    if (monthlyPriceCents !== null) parts.push(`${formatCents(monthlyPriceCents)} par mois`);
    return parts.length > 0 ? parts.join(", puis ") : "tarif sur demande";
  }

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Automerio n'est pas un logiciel à paramétrer : l'équipe installe chaque automatisation, la connecte aux outils que le client utilise déjà, et la surveille. Sans engagement de durée.",
    "",
    "## Solutions et tarifs",
    "",
  ];

  for (const [category, list] of byCategory) {
    lines.push(`### ${CATEGORY_LABELS[category]}`, "");
    for (const service of list) {
      lines.push(
        `- [${service.name}](${absoluteUrl(`/prestations/${service.slug}`)}) — ${service.description}`,
        `  Tarif : ${price(service.setupFeeCents, service.monthlyPriceCents)}.${
          service.usageCapLabel ? ` ${service.usageCapLabel}.` : ""
        }`
      );
    }
    lines.push("");
  }

  lines.push("## Questions fréquentes", "");
  for (const faq of FAQS) {
    lines.push(`### ${faq.question}`, "", faq.answer, "");
  }

  lines.push(
    "## Contact",
    "",
    `- Formulaire : ${absoluteUrl("/contact")}`,
    `- Créer un compte : ${absoluteUrl("/signup")}`,
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
