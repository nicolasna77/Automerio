import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { isWaitlistMode } from "@/lib/launch-mode";
import { publicContactUrl, publicServiceUrl } from "@/lib/public-links";
import { formatDate } from "@/lib/catalog";
import { getFaqs } from "@/lib/site-metadata";
import type { ServiceCategory } from "@/lib/catalog";
import { formatCentsWithVat } from "@/lib/vat";
import { usageCapLabelOf } from "@/lib/usage-cap";
import { getTrades, tradePath } from "@/lib/trades";

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

  const waitlist = isWaitlistMode();
  // Date de la dernière modification du catalogue : un signal de fraîcheur
  // pour les moteurs qui lisent ce fichier.
  const updatedAt = services.reduce(
    (latest, service) => (service.updatedAt > latest ? service.updatedAt : latest),
    new Date(0)
  );

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
    ...(waitlist ? [t("waitlistNotice", { url: publicContactUrl() }), ""] : []),
    t("updated", { date: formatDate(updatedAt) }),
    "",
    `## ${t("servicesHeading")}`,
    "",
    t("pricingFile", { url: absoluteUrl("/pricing.md") }),
    "",
  ];

  for (const [category, list] of byCategory) {
    lines.push(`### ${tCatalog(`categories.${category}`)}`, "");
    for (const service of list) {
      lines.push(
        `- [${service.name}](${publicServiceUrl(service.slug)}) : ${service.description}`,
        `  ${t("priceLine", { price: price(service.monthlyPriceCents) })}${
          usageCapLabelOf(service) ? ` ${usageCapLabelOf(service)}.` : ""
        }`
      );
    }
    lines.push("");
  }

  lines.push(`## ${t("tradesHeading")}`, "");
  for (const trade of getTrades()) {
    lines.push(`- [${trade.metaTitle}](${absoluteUrl(tradePath(trade.slug))}) : ${trade.metaDescription}`);
  }
  lines.push("");

  lines.push(`## ${t("faqHeading")}`, "");
  for (const faq of faqs) {
    lines.push(`### ${faq.question}`, "", faq.answer, "");
  }

  lines.push(
    `## ${t("contactHeading")}`,
    "",
    ...(waitlist
      ? [`- ${t("waitlistForm", { url: publicContactUrl() })}`]
      : [
          `- ${t("contactForm", { url: publicContactUrl() })}`,
          `- ${t("signup", { url: absoluteUrl("/signup") })}`,
        ]),
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
