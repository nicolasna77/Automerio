import type { Metadata } from "next";
import { getFaqs, siteOpenGraph } from "@/lib/site-metadata";
import { JsonLd, faqSchema } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCatalog } from "@/lib/get-catalog";
import { HeroSection } from "./home-sections/hero-section";
import { ProblemSection } from "./home-sections/problem-section";
import { ServicesSection } from "./home-sections/services-section";
import { MethodSection } from "./home-sections/method-section";
import { MaintenanceSection } from "./home-sections/maintenance-section";
import { FaqSection } from "./home-sections/faq-section";
import { CtaSection } from "./home-sections/cta-section";

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: "/" },
    openGraph: await siteOpenGraph({ url: "/" }),
  };
}

export default async function HomePage() {
  const [services, faqs] = await Promise.all([getCatalog(), getFaqs()]);
  const hasSupportPlan = services.some((s) => s.slug === "support-prioritaire");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="content" className="flex-1">
        <HeroSection services={services} />
        <ProblemSection />
        <MethodSection />
        <ServicesSection services={services} />
        {hasSupportPlan && (
          <MaintenanceSection services={services} />
        )}
        <JsonLd data={faqSchema(faqs)} />
        <FaqSection faqs={faqs} />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
