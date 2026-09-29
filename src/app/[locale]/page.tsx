import type { Metadata } from "next";
import { getFaqs, siteOpenGraph } from "@/lib/site-metadata";
import { getTranslations } from "next-intl/server";
import { JsonLd, faqSchema, serviceListSchema } from "@/components/json-ld";
import { formatUsageCap } from "@/lib/usage-cap";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCatalog } from "@/lib/get-catalog";
import { HeroSection } from "./home-sections/hero-section";
import { ProblemSection } from "./home-sections/problem-section";
import { ServicesSection } from "./home-sections/services-section";
import { IntegrationsSection } from "./home-sections/integrations-section";
import { MethodSection } from "./home-sections/method-section";
import { MaintenanceSection } from "./home-sections/maintenance-section";
import { FaqSection } from "./home-sections/faq-section";
import { CtaSection } from "./home-sections/cta-section";
import { WaitlistSection } from "./home-sections/waitlist-section";
import { isWaitlistMode } from "@/lib/launch-mode";

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: "/" },
    openGraph: await siteOpenGraph({ url: "/" }),
  };
}

export default async function HomePage() {
  const [services, faqs, tService, tHome] = await Promise.all([
    getCatalog(),
    getFaqs(),
    getTranslations("ServicePage"),
    getTranslations("Home.services"),
  ]);
  const hasSupportPlan = services.some((s) => s.slug === "support-prioritaire");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <HeroSection services={services} />
        <ProblemSection />
        <MethodSection />
        <JsonLd
          data={serviceListSchema(tHome("heading"), services, (service) => ({
            offerName: tService("offerName"),
            termsOfService: service.usageCap ? formatUsageCap(service.usageCap) : null,
          }))}
        />
        <ServicesSection services={services} />
        <IntegrationsSection />
        {hasSupportPlan && (
          <MaintenanceSection services={services} />
        )}
        <JsonLd data={faqSchema(faqs)} />
        <FaqSection faqs={faqs} />
        {isWaitlistMode() ? <WaitlistSection /> : <CtaSection />}
      </main>
      <SiteFooter />
    </div>
  );
}
