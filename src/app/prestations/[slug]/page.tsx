import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock3, ListChecks, Target } from "lucide-react";
import { JsonLd, faqSchema, priceSummary, serviceSchema } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, TELEPHONY_SERVICE_SLUGS, formatCents } from "@/lib/catalog";
import { getCatalog, getServiceBySlug } from "@/lib/get-catalog";
import { siteOpenGraph } from "@/lib/site";
import { excludingVatSuffix } from "@/lib/vat";
import { formatUsageCap } from "@/lib/usage-cap";
import { getServiceCopy } from "@/lib/service-copy";
import { FaqList } from "@/components/faq-list";
import { ServiceGlyph, ServiceGlyphBadge } from "@/components/service-glyph";
import { ServicePriceSimulator } from "@/components/subscription/service-price-simulator";
import { activationPath, authPathWithNext } from "@/lib/safe-redirect";
import { isDemoCallAvailable } from "@/lib/demo-call";
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
  const service = await getServiceBySlug(slug);
  if (!service) return {};
  const description = `${service.description} ${priceSummary(service)}`;
  const url = `/prestations/${service.slug}`;
  return {
    title: service.name,
    description,
    alternates: { canonical: url },
    openGraph: siteOpenGraph({ url, title: service.name, description }),
    twitter: { card: "summary_large_image", title: service.name, description },
  };
}

const GENERIC_FIELD_KEYS = new Set(["companyName"]);

const TRUST_POINTS = ["Installé par notre équipe", "Sans engagement", "Prix TTC affichés"];

// Des icones de resultat plutot qu'une coche repetee : chaque benefice a sa
// propre forme, sans pretendre illustrer un contenu qui varie d'une solution a l'autre.
const BENEFIT_ICONS = [Target, Clock3, ListChecks];

const INCLUDED = [
  {
    title: "L'installation, faite par notre équipe",
    description: "Nous la connectons à vos outils et la testons sur vos vrais cas avant l'activation.",
  },
  {
    title: "Le suivi chaque mois",
    description: "Nous surveillons son fonctionnement et l'ajustons quand votre activité change.",
  },
  {
    title: "Votre tableau de bord et le support",
    description: "Vous suivez son activité en ligne et l'équipe répond à vos questions.",
  },
];

export default async function PrestationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // En parallele : la session et le catalogue n'attendent pas la solution.
  const [service, session, allServices] = await Promise.all([
    getServiceBySlug(slug),
    getSession(),
    getCatalog(),
  ]);
  if (!service) notFound();
  const copy = getServiceCopy(service.slug);
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const configFields = service.configFields.filter(
    (field) => !GENERIC_FIELD_KEYS.has(field.key)
  );
  const related = allServices
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, 3);

  const primaryHref = session
    ? activationPath(service.slug)
    : authPathWithNext("/signup", activationPath(service.slug));
  const showDemoCall = isTelephony && isDemoCallAvailable();
  const previewFields = configFields.slice(0, 3).map((field) => field.label);
  const hiddenFieldCount = Math.max(0, configFields.length - previewFields.length);

  const steps = [
    {
      title: "Vous réglez l'essentiel",
      description:
        configFields.length > 0
          ? "Quelques informations sur votre activité, en quelques minutes et sans jargon."
          : "Vous choisissez la solution et l'activez en ligne, en quelques minutes.",
      preview: (
        <>
          <ConfigPreview labels={previewFields.length > 0 ? previewFields : ["Nom de votre entreprise", "Vos horaires"]} />
          {hiddenFieldCount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              + {hiddenFieldCount} autre{hiddenFieldCount > 1 ? "s" : ""} information{hiddenFieldCount > 1 ? "s" : ""}
            </p>
          )}
        </>
      ),
    },
    isTelephony
      ? {
          title: "Vous gardez votre numéro",
          description:
            "Un renvoi d'appel depuis votre ligne, gratuit et réversible : vos clients composent le numéro qu'ils connaissent.",
          preview: <ForwardingDiagram vertical />,
        }
      : {
          title: "Notre équipe installe",
          description: "Nous la connectons à vos outils et la testons sur vos vrais cas avant de l'activer.",
          preview: <SetupPreview />,
        },
    {
      title: "Elle travaille pour vous",
      description: "Vous suivez son activité dans votre tableau de bord ; nous la surveillons chaque mois.",
      preview: <ActivityPreview slug={service.slug} />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd data={serviceSchema(service)} />
      {copy && <JsonLd data={faqSchema(copy.faq)} />}
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          />

          <div className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
            <nav aria-label="Fil d'Ariane" className="flex justify-center">
              <ol className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                <li>
                  <ServiceGlyph slug={service.slug} className="size-4 text-primary" />
                </li>
                <li>
                  <Link href="/#prestations" className="rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring">
                    Solutions
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground">{CATEGORY_LABELS[service.category]}</li>
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
                id="essai"
                aria-labelledby="essai-heading"
                className="mx-auto mt-10 max-w-md scroll-mt-24 rounded-3xl border border-border bg-card p-5 text-left shadow-lg sm:p-6"
              >
                <h2 id="essai-heading" className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
                  <span className="relative flex size-2" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  Faites-vous appeler par notre assistant
                </h2>
                <p className="mt-1.5 mb-5 text-sm leading-relaxed text-muted-foreground">
                  Laissez votre numéro : l&apos;assistant vous appelle, se présente et répond à vos
                  questions. Gratuit, sans compte, un essai par numéro.
                </p>
                <DemoCallForm serviceSlug={service.slug} />
              </section>
            ) : (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                  Activer cette solution
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link href="#tarif" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  Voir le tarif
                </Link>
              </div>
            )}

            {showDemoCall && (
              <p className="mt-5 text-sm text-muted-foreground">
                Déjà convaincu ?{" "}
                <Link href={primaryHref} className="font-medium text-foreground underline-offset-4 hover:underline">
                  Activer cette solution
                </Link>{" "}
                ou{" "}
                <Link href="#tarif" className="font-medium text-foreground underline-offset-4 hover:underline">
                  voir le tarif
                </Link>
                .
              </p>
            )}

            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto mt-14 max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div className="rounded-[2rem] border border-border bg-muted/40 px-4 py-10 sm:px-12 sm:py-12">
              <ServiceIllustration slug={service.slug} />
            </div>
          </div>
        </section>

        <section aria-labelledby="etapes-heading" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="etapes-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                En place en quelques jours
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aucune connaissance technique requise : notre équipe s&apos;occupe du reste.
              </p>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
                  <div className="p-6">
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-full bg-muted font-mono text-xs text-foreground tabular-nums"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-4 font-sans text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="mt-auto border-t border-border bg-muted/40 p-6">{step.preview}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tarif" aria-labelledby="tarif-heading" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="tarif-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                Tarif
              </h2>
              <p className="mt-4 text-muted-foreground">
                Un prix affiché, sans devis à attendre. Sans engagement de durée.
              </p>
            </div>
            <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
              <ul className="divide-y divide-border border-y border-border">
                {INCLUDED.map((item) => (
                  <li key={item.title} className="flex gap-4 py-5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Card className="gap-0 px-(--card-spacing) lg:sticky lg:top-24 lg:order-first">
                <p className="text-sm font-medium text-muted-foreground">{service.name}</p>
                <dl className="mt-4 divide-y divide-border">
                  {service.setupFeeCents !== null && (
                    <div className="pb-4">
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.setupFeeCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">
                        TTC, &agrave; l&apos;installation
                        <span className="block text-xs">{excludingVatSuffix(service.setupFeeCents)}</span>
                      </dt>
                    </div>
                  )}
                  {service.monthlyPriceCents !== null && !service.tier && (
                    <div className="py-4 first:pt-0">
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.monthlyPriceCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">
                        TTC par mois
                        <span className="block text-xs">{excludingVatSuffix(service.monthlyPriceCents)}</span>
                      </dt>
                    </div>
                  )}
                  {service.usageCap && !service.tier && (
                    <div className="py-4">
                      <dt className="text-sm text-muted-foreground">Compris</dt>
                      <dd className="mt-1 text-sm text-foreground">{formatUsageCap(service.usageCap)}</dd>
                    </div>
                  )}
                  {service.tier && service.usageCap && (
                    <div className="py-4 first:pt-0">
                      <ServicePriceSimulator
                        tier={service.tier}
                        overageUnitPriceCents={service.usageCap.overageUnitPriceCents}
                        slug={service.slug}
                        signedIn={Boolean(session)}
                      />
                    </div>
                  )}
                </dl>
                {!service.tier && (
                  <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "mt-2 w-full" })}>
                    Activer cette solution
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                )}
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  Sans engagement, r&eacute;siliable &agrave; tout moment.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {copy && (
          <section aria-labelledby="benefices-heading" className="border-t border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <h2 id="benefices-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                    Ce que &ccedil;a change pour vous
                  </h2>
                  <p className="mt-4 leading-relaxed text-pretty text-muted-foreground">{copy.intro}</p>
                </div>
                <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "shrink-0 self-start md:self-end" })}>
                  Activer cette solution
                </Link>
              </div>
              <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
                {copy.benefits.map((benefit, index) => {
                  const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
                  return (
                    <li key={benefit.title}>
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                      <h3 className="mt-3 font-sans text-lg font-semibold text-foreground">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {copy?.useCases && (
          <section aria-labelledby="situations-heading" className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <h2 id="situations-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                  Des situations o&ugrave; elle travaille pour vous
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Des exemples typiques : l&apos;&eacute;quipe adapte la solution &agrave; vos cas
                  r&eacute;els pendant l&apos;installation.
                </p>
              </div>
              <dl className="mt-12 grid gap-4 md:grid-cols-3">
                {copy.useCases.map((useCase) => (
                  <div key={useCase.audience} className="flex flex-col rounded-3xl border border-border bg-card p-6">
                    <dt className="self-end">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                        {useCase.audience}
                      </span>
                    </dt>
                    <dd className="mt-6 leading-relaxed text-foreground">{useCase.scenario}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {copy && (
          <section aria-labelledby="faq-heading" className="border-t border-border">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
              <h2 id="faq-heading" className="text-center text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
                Questions fr&eacute;quentes
              </h2>
              <FaqList items={copy.faq} className="mt-10" />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Votre question n&apos;est pas l&agrave; ?{" "}
                <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
                  &Eacute;crivez-nous
                </Link>
                , on r&eacute;pond sous 24h ouvr&eacute;es.
              </p>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
              <h2 id="related-heading" className="text-2xl font-semibold tracking-tight text-foreground">
                Autres solutions en {CATEGORY_LABELS[service.category].toLowerCase()}
              </h2>
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {related.map((relatedService) => (
                  <li key={relatedService.slug}>
                    <Link
                      href={`/prestations/${relatedService.slug}`}
                      className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/40 focus-visible:focus-ring"
                    >
                      <ServiceGlyphBadge slug={relatedService.slug} />
                      <h3 className="mt-4 font-sans font-semibold text-foreground">{relatedService.name}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{relatedService.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        Découvrir
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-labelledby="cta-heading" className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_120%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent)]"
            />
            <h2 id="cta-heading" className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
              {session
                ? `Activez « ${service.name} » depuis votre tableau de bord`
                : `Prêt à activer « ${service.name} » ?`}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
              Notre équipe l&apos;installe, la connecte à vos outils et la surveille chaque mois.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                Activer cette solution
                <ArrowRight data-icon="inline-end" />
              </Link>
              {showDemoCall ? (
                <Link href="#essai" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  Tester l&apos;assistant
                </Link>
              ) : (
                <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  Poser une question
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
