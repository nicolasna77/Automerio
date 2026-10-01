import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, ChevronRight, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqList } from "@/components/faq-list";
import { MonthlyPrice } from "@/components/monthly-price";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/json-ld";
import { getCatalog } from "@/lib/get-catalog";
import { siteOpenGraph } from "@/lib/site-metadata";
import { getTrade, getTrades, tradePath } from "@/lib/trades";
import { isWaitlistMode } from "@/lib/launch-mode";
import { WaitlistSection } from "../../home-sections/waitlist-section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trade = getTrade(slug);
  if (!trade) return {};
  const url = tradePath(trade.slug);
  return {
    title: trade.metaTitle,
    description: trade.metaDescription,
    alternates: { canonical: url },
    openGraph: await siteOpenGraph({ url, title: trade.metaTitle, description: trade.metaDescription }),
    twitter: { card: "summary_large_image", title: trade.metaTitle, description: trade.metaDescription },
  };
}

export default async function TradePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trade = getTrade(slug);
  if (!trade) notFound();

  const waitlist = isWaitlistMode();
  const [t, tWaitlist, catalog] = await Promise.all([
    getTranslations("TradePage"),
    getTranslations("Waitlist"),
    getCatalog(),
  ]);
  const name = trade.name.toLowerCase();
  // Seules les solutions actives du catalogue s'affichent, avec leur prix réel.
  const solutions = trade.solutions.flatMap((solution) => {
    const service = catalog.find((s) => s.slug === solution.slug);
    return service ? [{ ...solution, service }] : [];
  });
  const otherTrades = getTrades().filter((other) => other.slug !== trade.slug);
  const path = tradePath(trade.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <JsonLd
        data={breadcrumbSchema([
          { name: t("breadcrumbHome"), path: "/" },
          { name: t("breadcrumbAudience"), path: "/#pour-qui" },
          { name: trade.name, path },
        ])}
      />
      <JsonLd data={faqSchema(trade.faq)} />
      <main id="content" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
            <nav aria-label={t("breadcrumb")} className="flex justify-center">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground">
                    {t("breadcrumbHome")}
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <li>
                  <Link href="/#pour-qui" className="hover:text-foreground">
                    {t("breadcrumbAudience")}
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <li aria-current="page" className="text-foreground">
                  {trade.name}
                </li>
              </ol>
            </nav>
            <div className="mx-auto mt-8 max-w-3xl text-center">
              <span className="text-sm font-medium text-primary">{t("eyebrow", { name })}</span>
              <h1 className="mt-3 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
                {trade.title}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
                {trade.lead}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
                <Link href={waitlist ? "#waitlist" : "/signup"} className={buttonVariants({ size: "lg" })}>
                  {waitlist ? tWaitlist("cta") : t("signup")}
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link
                  href="#solutions"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:focus-ring focus-visible:outline-none"
                >
                  {t("seeSolutions")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">{t("for", { trades: trade.trades })}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="pains-heading" className="bg-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="pains-heading" className="text-center text-3xl font-semibold tracking-tight text-foreground">
              {t("painsHeading")}
            </h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {trade.pains.map((pain) => (
                <li key={pain.title} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-lg font-semibold text-foreground">{pain.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{pain.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="call-heading" className="border-t border-border py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 id="call-heading" className="text-3xl font-semibold tracking-tight text-foreground">
                {t("callHeading")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("callLead")}</p>
            </div>
            <figure className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
              <figcaption className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {trade.call.company}
              </figcaption>
              <dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm leading-relaxed">
                {trade.call.turns.map((turn, index) => (
                  <div key={index}>
                    <dt className="font-mono text-xs text-muted-foreground">
                      {turn.speaker === "caller" ? t("caller") : t("assistant")}
                    </dt>
                    <dd className="mt-0.5 text-foreground">{turn.text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="font-medium">{t("result")} : </span>
                  {trade.call.result}
                </span>
              </p>
            </figure>
          </div>
        </section>

        {solutions.length > 0 && (
          <section
            id="solutions"
            aria-labelledby="solutions-heading"
            className="scroll-mt-20 border-t border-border bg-muted/40 py-16 sm:py-20"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h2 id="solutions-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground">
                  {t("solutionsHeading", { name })}
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">{t("solutionsLead")}</p>
              </div>
              <ul className="mt-10 grid gap-4 md:grid-cols-3">
                {solutions.map(({ service, why }) => (
                  <li key={service.slug} className="flex flex-col rounded-lg border border-border bg-card p-6">
                    <ServiceGlyphBadge slug={service.slug} size="md" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{service.name}</h3>
                    <p className="mt-2 mb-6 leading-relaxed text-muted-foreground">{why}</p>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                      {service.monthlyPriceCents !== null && <MonthlyPrice cents={service.monthlyPriceCents} />}
                      {!waitlist && (
                        <Link
                          href={`/services/${service.slug}`}
                          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t("seeSolution")}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-labelledby="trade-faq-heading" className="border-t border-border py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="trade-faq-heading" className="text-center text-3xl font-semibold tracking-tight text-foreground">
              {t("faqHeading")}
            </h2>
            <FaqList items={trade.faq} className="mt-10" />
          </div>
        </section>

        <nav aria-labelledby="other-trades-heading" className="border-t border-border py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="other-trades-heading" className="text-center text-sm font-medium text-muted-foreground">
              {t("otherTrades")}
            </h2>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {otherTrades.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={tradePath(other.slug)}
                    className="inline-flex rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {other.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {waitlist ? (
          <WaitlistSection />
        ) : (
          <section aria-labelledby="trade-cta-heading" className="px-4 pb-20 sm:px-6 sm:pb-24">
            <div className="mx-auto max-w-6xl rounded-lg border border-border bg-card px-6 py-14 text-center sm:py-16">
              <h2
                id="trade-cta-heading"
                className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground"
              >
                {t("ctaHeading")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t("ctaLead")}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                  {t("signup")}
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  {t("ctaContact")}
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("ctaNote")}</p>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
