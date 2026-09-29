import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getFaqs } from "@/lib/site-metadata";
import type { ServiceCategory } from "@/lib/catalog";
import { formatCentsWithVat } from "@/lib/vat";
import { usageCapLabelOf } from "@/lib/usage-cap";

export const dynamic = "force-dynamic";

export async function GET() {
  const locale = routing.defaultLocale;
  const [t, tSite, tCatalog, faqs] = await Promise.all([
    getTranslations({ locale, namespace: "LlmsTxt" }),
    getTranslations({ locale, namespace: "Site" }),
    getTranslations({ locale, namespace: "Catalog" }),
    getFaqs(locale),
  ]);
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

  function price(monthlyPriceCents: number | null): string {
    return monthlyPriceCents !== null
      ? t("price", { price: formatCentsWithVat(monthlyPriceCents) })
      : t("priceOnRequest");
  }

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${tSite("description")}`,
    "",
    t("intro"),
    "",
    `## ${t("servicesHeading")}`,
    "",
  ];

  for (const [category, list] of byCategory) {
    lines.push(`### ${tCatalog(`categories.${category}`)}`, "");
    for (const service of list) {
      lines.push(
        `- [${service.name}](${absoluteUrl(`/services/${service.slug}`)}) : ${service.description}`,
        `  ${t("priceLine", { price: price(service.monthlyPriceCents) })}${
          usageCapLabelOf(service) ? ` ${usageCapLabelOf(service)}.` : ""
        }`
      );
    }
    lines.push("");
  }

  lines.push(`## ${t("faqHeading")}`, "");
  for (const faq of faqs) {
    lines.push(`### ${faq.question}`, "", faq.answer, "");
  }

  lines.push(
    `## ${t("contactHeading")}`,
    "",
    `- ${t("contactForm", { url: absoluteUrl("/contact") })}`,
    `- ${t("signup", { url: absoluteUrl("/signup") })}`,
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
