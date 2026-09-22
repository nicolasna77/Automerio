import type { Metadata } from "next";
import { siteOpenGraph } from "@/lib/site";
import { JsonLd, faqSchema } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCatalog } from "@/lib/get-catalog";
import { HeroSection } from "./home-sections/hero-section";
import { ProblemSection } from "./home-sections/problem-section";
import { PresentationSection } from "./home-sections/presentation-section";
import { ServicesSection } from "./home-sections/services-section";
import { MethodSection } from "./home-sections/method-section";
import { MaintenanceSection } from "./home-sections/maintenance-section";
import { FaqSection } from "./home-sections/faq-section";
import { CtaSection } from "./home-sections/cta-section";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: siteOpenGraph({ url: "/" }),
};

export default async function HomePage() {
  const services = await getCatalog();
  const hasSupportPlan = services.some((s) => s.slug === "support-prioritaire");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <HeroSection services={services} />
        <ProblemSection />
        <PresentationSection />
        <ServicesSection services={services} />
        <MethodSection />
        {hasSupportPlan && (
          <MaintenanceSection services={services} />
        )}
        <JsonLd data={faqSchema()} />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
