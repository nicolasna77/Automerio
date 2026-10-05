import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock3, ListChecks, Target } from "lucide-react";
import {
  JsonLd,
  faqSchema,
  priceSummary,
  serviceSchema,
} from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";
import { TELEPHONY_SERVICE_SLUGS } from "@/lib/catalog";
import { getCatalog, getServiceBySlug } from "@/lib/get-catalog";
import { siteOpenGraph } from "@/lib/site-metadata";
import { getPriceFormatter } from "@/lib/price-format-server";
import { getServiceCopy } from "@/lib/service-copy";
import { FaqList } from "@/components/faq-list";
import { ServiceGlyph, ServiceGlyphBadge } from "@/components/service-glyph";
import { ServicePriceSimulator } from "@/components/subscription/service-price-simulator";
import { activationPath, authPathWithNext } from "@/lib/safe-redirect";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { cn } from "@/lib/utils";
import { DemoCallForm } from "./demo-call-form";
import {
  ActivityPreview,
  ConfigPreview,
  ForwardingDiagram,
  ServiceIllustration,
  SetupPreview,
} from "@/components/service-illustrations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [service, t, price] = await Promise.all([
    getServiceBySlug(slug),
    getTranslations("ServicePage"),
    getPriceFormatter(),
  ]);
  if (!service) return {};
  const description = `${service.description} ${priceSummary(service, t, price.cents)}`;
  const url = `/services/${service.slug}`;
  return {
    title: service.name,
    description,
    alternates: { canonical: url },
    openGraph: await siteOpenGraph({ url, title: service.name, description }),
    twitter: { card: "summary_large_image", title: service.name, description },
  };
}

const GENERIC_FIELD_KEYS = new Set(["companyName"]);

const TRUST_POINTS = ["installed", "noCommitment", "vatIncluded"] as const;

const BENEFIT_ICONS = [Target, Clock3, ListChecks];

const INCLUDED = ["setup", "monitoring", "dashboard"] as const;

export default async function PrestationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, session, allServices, t, tCatalog, locale, price] = await Promise.all([
    getServiceBySlug(slug),
    getSession(),
    getCatalog(),
    getTranslations("ServicePage"),
    getTranslations("Catalog"),
    getLocale(),
    getPriceFormatter(),
  ]);
  if (!service) notFound();
  const copy = getServiceCopy(service.slug, locale);
  const categoryLabel = tCatalog(`categories.${service.category}`);
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const configFields = service.configFields.filter(
    (field) => !GENERIC_FIELD_KEYS.has(field.key),
  );
  const related = allServices
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, 3);

  const primaryHref = session
    ? activationPath(service.slug)
    : authPathWithNext("/signup", activationPath(service.slug));
  const showDemoCall = isTelephony && isDemoCallAvailable();
  const previewFields = configFields.slice(0, 3).map((field) => field.label);
  const hiddenFieldCount = Math.max(
    0,
    configFields.length - previewFields.length,
  );

  const phoneIncluded =
    isTelephony && service.usageCap
      ? [
          {
            title: t("phoneIncluded.minutesTitle", {
              minutes: price.usageUnits(service.usageCap.includedUnits, service.usageCap.unit),
            }),
            description: service.tier
              ? t("phoneIncluded.minutesWithTier", {
                  max: price.usageUnits(service.tier.maxUnits, service.tier.unit),
                  overage: price.amountWithVat(service.usageCap.overageUnitPriceCents),
                })
              : t("phoneIncluded.minutesOverage", {
                  overage: price.amountWithVat(service.usageCap.overageUnitPriceCents),
                }),
          },
          { title: t("phoneIncluded.numberTitle"), description: t("phoneIncluded.numberDescription") },
          service.slug === "standard-telephonique-ia"
            ? { title: t("phoneIncluded.transferTitle"), description: t("phoneIncluded.transferDescription") }
            : { title: t("phoneIncluded.bookingTitle"), description: t("phoneIncluded.bookingDescription") },
          { title: t("phoneIncluded.summaryTitle"), description: t("phoneIncluded.summaryDescription") },
          { title: t("phoneIncluded.callbacksTitle"), description: t("phoneIncluded.callbacksDescription") },
          { title: t("phoneIncluded.teamTitle"), description: t("phoneIncluded.teamDescription") },
        ]
      : null;
  const includedItems =
    phoneIncluded ??
    INCLUDED.map((item) => ({
      title: t(`included.${item}.title`),
      description: t(`included.${item}.description`),
    }));

  const steps = [
    {
      title: t("steps.configure.title"),
      description:
        configFields.length > 0 ? t("steps.configure.withFields") : t("steps.configure.withoutFields"),
      preview: (
        <>
          <ConfigPreview
            labels={
              previewFields.length > 0
                ? previewFields
                : [t("steps.configure.defaultFields.companyName"), t("steps.configure.defaultFields.hours")]
            }
          />
          {hiddenFieldCount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("steps.configure.moreFields", { count: hiddenFieldCount })}
            </p>
          )}
        </>
      ),
    },
    isTelephony
      ? {
          title: t("steps.keepNumber.title"),
          description: t("steps.keepNumber.description"),
          preview: <ForwardingDiagram vertical />,
        }
      : {
          title: t("steps.teamSetup.title"),
          description: t("steps.teamSetup.description"),
          preview: <SetupPreview />,
        },
    {
      title: t("steps.working.title"),
      description: t("steps.working.description"),
      preview: <ActivityPreview slug={service.slug} />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd
        data={serviceSchema(service, {
          offerName: t("offerName"),
          termsOfService: service.usageCap ? price.usageCap(service.usageCap) : null,
        })}
      />
      {copy && <JsonLd data={faqSchema(copy.faq)} />}
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
            <nav aria-label={t("breadcrumb")} className="flex justify-center">
              <ol className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                <li>
                  <ServiceGlyph
                    slug={service.slug}
                    className="size-4 text-primary"
                  />
                </li>
                <li>
                  <Link
                    href="/#services"
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring"
                  >
                    {t("solutions")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground">
                  {categoryLabel}
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              {service.name}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {service.description}
            </p>

            {showDemoCall ? (
              <section
                id="demo"
                aria-labelledby="demo-heading"
                className="mx-auto mt-10 max-w-md scroll-mt-24 rounded-3xl border border-border bg-card p-5 text-left shadow-lg sm:p-6"
              >
                <h2
                  id="demo-heading"
                  className="flex items-center gap-2 font-sans text-base font-semibold text-foreground"
                >
                  {t("demo.heading")}
                </h2>
                <p className="mt-1.5 mb-5 text-sm leading-relaxed text-muted-foreground">
                  {t("demo.lead")}
                </p>
                <DemoCallForm serviceSlug={service.slug} />
              </section>
            ) : (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href={primaryHref}
                  className={buttonVariants({ size: "lg" })}
                >
                  {t("activate")}
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link
                  href="#pricing"
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                >
                  {t("seePricing")}
                </Link>
              </div>
            )}

            {showDemoCall && (
              <p className="mt-5 text-sm text-muted-foreground">
                {t.rich("demo.alreadyConvinced", {
                  activate: (chunks) => (
                    <Link
                      href={primaryHref}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                  pricing: (chunks) => (
                    <Link
                      href="#pricing"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
          </div>

          <div className="mx-auto mt-14 max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-10 sm:px-12 sm:py-12">
              <ServiceIllustration slug={service.slug} />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="steps-heading"
          className="border-t border-border"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <h2
                id="steps-heading"
                className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
              >
                {t("steps.heading")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("steps.lead")}
              </p>
            </div>
            {/* Une rangée par étape, le texte à gauche et l'aperçu à droite,
                toujours dans le même sens : on lit les étapes de haut en bas. */}
            <ol className="mt-12 divide-y divide-border border-y border-border">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid gap-6 py-10 lg:grid-cols-12 lg:items-center lg:gap-12"
                >
                  <div className="flex gap-4 lg:col-span-5">
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-medium text-primary-foreground tabular-nums"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-sans text-xl font-semibold tracking-tight text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-6 sm:p-8 lg:col-span-7">
                    <div className="mx-auto max-w-md">{step.preview}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="pricing"
          aria-labelledby="pricing-heading"
          className="scroll-mt-20 border-t border-border"
        >
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="pricing-heading"
                className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
              >
                {t("pricing.heading")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("pricing.lead")}
              </p>
            </div>
            <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
              <div>
              <h3 className="text-base font-semibold text-foreground">{t("pricing.includedHeading")}</h3>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {includedItems.map((item) => (
                  <li key={item.title} className="flex gap-4 py-5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              </div>

              <Card className="gap-0 px-(--card-spacing) lg:sticky lg:top-24 lg:order-first">
                <p className="text-sm font-medium text-muted-foreground">
                  {service.name}
                </p>
                {/* Le prix s'affiche au-dessus de son libellé, mais le terme
                    (dt) précède sa valeur (dd) dans le code. Le simulateur,
                    qui n'est ni l'un ni l'autre, reste hors de la liste. */}
                {!service.tier && (
                  <dl className="mt-4 divide-y divide-border">
                    {service.monthlyPriceCents !== null && (
                      <div className="flex flex-col-reverse py-4 first:pt-0">
                        <dt className="mt-0.5 text-sm text-muted-foreground">
                          {t("pricing.perMonthVat")}
                          <span className="block text-xs">
                            {price.excludingVatSuffix(service.monthlyPriceCents)}
                          </span>
                        </dt>
                        <dd className="font-mono text-3xl font-medium tabular-nums text-foreground">
                          {price.cents(service.monthlyPriceCents)}
                        </dd>
                      </div>
                    )}
                    {service.usageCap && (
                      <div className="py-4">
                        <dt className="text-sm text-muted-foreground">{t("pricing.included")}</dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {price.usageCap(service.usageCap)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                {service.tier && service.usageCap && (
                  <div className="mt-4 py-4 pt-0">
                    <ServicePriceSimulator
                      tier={service.tier}
                      overageUnitPriceCents={service.usageCap.overageUnitPriceCents}
                      slug={service.slug}
                      signedIn={Boolean(session)}
                    />
                  </div>
                )}
                {!service.tier && (
                  <Link
                    href={primaryHref}
                    className={buttonVariants({
                      size: "lg",
                      className: "mt-2 w-full",
                    })}
                  >
                    {t("activate")}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                )}
                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  {TRUST_POINTS.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <Check className="size-4 text-primary" aria-hidden="true" />
                      {t(`trust.${point}`)}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {copy && (
          <section
            aria-labelledby="benefits-heading"
            className="border-t border-border bg-muted/40"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-2xl">
                <h2
                  id="benefits-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
                >
                  {t("benefitsHeading")}
                </h2>
                <p className="mt-4 leading-relaxed text-pretty text-muted-foreground">
                  {copy.intro}
                </p>
              </div>
              {/* Le premier bénéfice en grand, les deux autres empilés à côté,
                  plutôt que trois colonnes identiques. */}
              <ul className="mt-12 grid gap-4 lg:grid-cols-2">
                {copy.benefits.map((benefit, index) => {
                  const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
                  const lead = index === 0;
                  return (
                    <li
                      key={benefit.title}
                      className={cn(
                        "rounded-lg border p-6",
                        lead
                          ? "flex flex-col justify-center border-primary/30 bg-primary/5 sm:p-8 lg:row-span-2"
                          : "border-border bg-card"
                      )}
                    >
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                      <h3
                        className={cn(
                          "mt-3 font-sans font-semibold tracking-tight text-foreground",
                          lead ? "text-2xl text-balance" : "text-lg"
                        )}
                      >
                        {benefit.title}
                      </h3>
                      <p className={cn("mt-2 leading-relaxed text-muted-foreground", lead ? "sm:text-lg" : "text-sm")}>
                        {benefit.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "mt-10" })}>
                {t("activate")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
          </section>
        )}

        {copy?.useCases && (
          <section
            aria-labelledby="situations-heading"
            className="border-t border-border"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-2xl">
                <h2
                  id="situations-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
                >
                  {t("useCases.heading")}
                </h2>
                <p className="mt-4 text-muted-foreground">
                  {t("useCases.lead")}
                </p>
              </div>
              <dl className="mt-12 divide-y divide-border border-y border-border">
                {copy.useCases.map((useCase) => (
                  <div
                    key={useCase.audience}
                    className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8"
                  >
                    <dt className="font-semibold text-foreground">{useCase.audience}</dt>
                    <dd className="max-w-prose leading-relaxed text-muted-foreground">
                      {useCase.scenario}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {copy && (
          <section
            aria-labelledby="faq-heading"
            className="border-t border-border"
          >
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
              <h2
                id="faq-heading"
                className="text-center text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
              >
                {t("faq.heading")}
              </h2>
              <FaqList items={copy.faq} className="mt-10" />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t.rich("faq.notHere", {
                  link: (chunks) => (
                    <Link
                      href="/contact"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="border-t border-border"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
              <h2
                id="related-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                {t("related.heading", { category: categoryLabel.toLocaleLowerCase(locale) })}
              </h2>
              <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-card">
                {related.map((relatedService) => (
                  <li key={relatedService.slug}>
                    <Link
                      href={`/services/${relatedService.slug}`}
                      className="group flex items-center gap-4 p-5 transition-colors hover:bg-muted/40 focus-visible:focus-ring sm:gap-6 sm:p-6"
                    >
                      <ServiceGlyphBadge slug={relatedService.slug} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans font-semibold text-foreground">
                          {relatedService.name}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                          {relatedService.description}
                        </span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
                        {t("related.discover")}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-primary sm:hidden" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section
          aria-labelledby="cta-heading"
          className="px-4 pb-16 sm:px-6 sm:pb-24"
        >
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-lg border border-border bg-card px-6 py-16 text-center sm:py-20">
            <h2
              id="cta-heading"
              className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
            >
              {session
                ? t("cta.headingSignedIn", { name: service.name })
                : t("cta.headingSignedOut", { name: service.name })}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
              {t("cta.lead")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={primaryHref}
                className={buttonVariants({ size: "lg" })}
              >
                {t("activate")}
                <ArrowRight data-icon="inline-end" />
              </Link>
              {showDemoCall ? (
                <Link
                  href="#demo"
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                >
                  {t("cta.tryAssistant")}
                </Link>
              ) : (
                <Link
                  href="/contact"
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                >
                  {t("cta.ask")}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
