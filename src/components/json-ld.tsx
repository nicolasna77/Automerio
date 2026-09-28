import { absoluteUrl, SITE_NAME, siteUrl, type Faq } from "@/lib/site";
import { LEGAL_ENTITY } from "@/lib/legal";
import { formatCents, type ServiceDTO } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
      }}
    />
  );
}

export function organizationSchema(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: absoluteUrl("/icon.svg"),
    email: LEGAL_ENTITY.email,
    description,
    areaServed: { "@type": "Country", name: "France" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: LEGAL_ENTITY.email,
      url: absoluteUrl("/contact"),
      availableLanguage: ["fr"],
    },
  };
}

export function faqSchema(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function serviceSchema(service: ServiceDTO) {
  const offers: object[] = [];
  if (service.monthlyPriceCents !== null) {
    offers.push({
      "@type": "Offer",
      name: "Abonnement mensuel",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: (service.monthlyPriceCents / 100).toFixed(2),
        priceCurrency: "EUR",
        billingIncrement: 1,
        unitCode: "MON",
        valueAddedTaxIncluded: true,
      },
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: absoluteUrl(`/services/${service.slug}`),
    provider: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
    areaServed: { "@type": "Country", name: "France" },
    ...(offers.length > 0 && {
      offers: offers.length === 1 ? offers[0] : offers,
    }),
    ...(service.usageCap && { termsOfService: formatUsageCap(service.usageCap) }),
  };
}

export function priceSummary(service: ServiceDTO): string {
  if (service.monthlyPriceCents === null) return "Tarif sur demande.";
  return `${formatCents(service.monthlyPriceCents)} TTC par mois, sans frais d'installation.`;
}
