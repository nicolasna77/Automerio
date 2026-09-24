import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
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
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { ServicePriceSimulator } from "@/components/subscription/service-price-simulator";
import { activationPath, authPathWithNext } from "@/lib/safe-redirect";
import { isDemoCallAvailable } from "@/lib/demo-call";
import { DemoCallForm } from "./demo-call-form";
import { ForwardingDiagram, ServiceIllustration } from "@/components/service-illustrations";

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

const PHONE_FORWARDING_STEPS = [
  {
    title: "Un numéro dédié à l'IA",
    description:
      "Dès l'activation, nous vous attribuons un numéro rien que pour cette solution.",
  },
  {
    title: "Un renvoi d'appel, gratuit et réversible",
    description:
      "Depuis votre ligne actuelle, vous activez un simple renvoi vers ce numéro — désactivable à tout moment.",
  },
  {
    title: "Vos clients ne voient aucun changement",
    description:
      "Ils composent le numéro qu'ils connaissent déjà ; l'IA prend le relais automatiquement.",
  },
];

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
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [session, allServices] = await Promise.all([getSession(), getCatalog()]);
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd data={serviceSchema(service)} />
      {copy && <JsonLd data={faqSchema(copy.faq)} />}
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          />
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
            <nav aria-label="Fil d'Ariane">
              <ol className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                <li>
                  <Link
                    href="/#prestations"
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring"
                  >
                    Toutes les solutions
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>{CATEGORY_LABELS[service.category]}</li>
              </ol>
            </nav>

            <div className="mt-10 grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16">
              <div>
                <ServiceGlyphBadge slug={service.slug} size="lg" />
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
                  {service.name}
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                  {service.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                    {session ? "Activer cette solution" : "Créer mon compte"}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                  {session ? (
                    <Link href="#tarif" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                      Voir le tarif
                    </Link>
                  ) : (
                    <Link
                      href={authPathWithNext("/login", activationPath(service.slug))}
                      className={buttonVariants({ size: "lg", variant: "secondary" })}
                    >
                      Se connecter
                    </Link>
                  )}
                </div>

                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {["Installé par notre équipe", "Sans engagement", "Prix TTC affichés"].map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary" aria-hidden="true" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <ServiceIllustration slug={service.slug} />
            </div>
          </div>
        </section>

        <section id="tarif" aria-labelledby="tarif-heading" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
            <div>
              <h2
                id="tarif-heading"
                className="text-3xl font-semibold tracking-tight text-balance text-foreground"
              >
                Tarif
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Un prix affiché, sans devis à attendre. Ce qui est compris :
              </p>
              <ul className="mt-8 max-w-xl divide-y divide-border border-y border-border">
                {INCLUDED.map((item) => (
                  <li key={item.title} className="flex gap-4 py-4">
                    <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="gap-0 px-(--card-spacing) lg:sticky lg:top-24">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {service.name}
              </p>
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
                  {session ? "Activer cette solution" : "Créer mon compte"}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              )}
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Sans engagement, r&eacute;siliable &agrave; tout moment.
              </p>
            </Card>
          </div>
        </section>

        {isTelephony && isDemoCallAvailable() && (
          <section aria-labelledby="essai-heading" className="border-b border-border bg-muted/40">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
              <div>
                <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-primary uppercase">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Essai gratuit, sans compte
                </p>
                <h2
                  id="essai-heading"
                  className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Faites-vous appeler par notre assistant
                </h2>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                  Laissez votre numéro : l&apos;assistant IA d&apos;Automerio vous appelle,
                  vous présente ce qu&apos;il peut faire pour votre activité et répond à vos
                  questions. Un essai par numéro.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <DemoCallForm serviceSlug={service.slug} />
              </div>
            </div>
          </section>
        )}

        {copy && (
          <section aria-labelledby="benefices-heading" className="border-b border-border">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2
                  id="benefices-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Ce que &ccedil;a change pour vous
                </h2>
                <p className="mt-5 leading-relaxed text-pretty text-muted-foreground">{copy.intro}</p>
              </div>
              <ol className="divide-y divide-border border-y border-border">
                {copy.benefits.map((benefit, index) => (
                  <li key={benefit.title} className="grid gap-3 py-8 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <span className="font-mono text-sm text-primary tabular-nums" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-foreground">
                        {benefit.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">{benefit.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {copy?.useCases && (
          <section aria-labelledby="situations-heading" className="border-b border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-2xl">
                <h2
                  id="situations-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Des situations o&ugrave; elle travaille pour vous
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Des exemples typiques, &agrave; transposer &agrave; votre activit&eacute; —
                  l&apos;&eacute;quipe adapte la solution &agrave; vos cas r&eacute;els pendant
                  l&apos;installation.
                </p>
              </div>
              <dl className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
                {copy.useCases.map((useCase) => (
                  <div key={useCase.audience} className="flex flex-col bg-background p-6 sm:p-8">
                    <dt>
                      <span className="inline-flex rounded-full border border-border px-2.5 py-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                        {useCase.audience}
                      </span>
                    </dt>
                    <dd className="mt-5 font-heading text-lg leading-snug text-foreground">
                      {useCase.scenario}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {isTelephony && (
          <section aria-labelledby="numero-heading" className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-2xl">
                <h2
                  id="numero-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Vous gardez votre num&eacute;ro actuel
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Aucune portabilit&eacute;, aucune interruption de service : vos clients
                  continuent d&apos;appeler le num&eacute;ro qu&apos;ils connaissent d&eacute;j&agrave;.
                </p>
              </div>
              <div className="mt-12">
                <ForwardingDiagram />
              </div>
              <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
                {PHONE_FORWARDING_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="font-mono text-sm text-primary tabular-nums" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {configFields.length > 0 && (
          <section aria-labelledby="config-heading" className="border-b border-border">
            <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <div>
                <h2
                  id="config-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Ce que vous configurez &agrave; l&apos;activation
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  L&apos;&eacute;quipe Automerio installe et connecte la solution. Voici les
                  informations qu&apos;on vous demande pour la personnaliser &agrave; votre
                  activit&eacute; : quelques minutes, sans jargon.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    Fiche d&apos;activation
                  </p>
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-border" />
                    <span className="size-2 rounded-full bg-border" />
                    <span className="size-2 rounded-full bg-primary/60" />
                  </span>
                </div>
                <dl className="divide-y divide-border">
                  {configFields.map((field) => (
                    <div key={field.key} className="py-4">
                      <dt className="text-sm font-medium text-foreground">{field.label}</dt>
                      <dd className="mt-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {field.helpText ?? "Vous le renseignez en quelques mots."}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        )}

        {copy && (
          <section aria-labelledby="faq-heading" className="border-b border-border">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <div>
                <h2
                  id="faq-heading"
                  className="text-3xl font-semibold tracking-tight text-balance text-foreground"
                >
                  Les questions qu&apos;on nous pose sur cette solution
                </h2>
                <p className="mt-4 text-sm text-muted-foreground">
                  Votre question n&apos;est pas l&agrave; ?{" "}
                  <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
                    &Eacute;crivez-nous
                  </Link>
                  , on r&eacute;pond sous 24h ouvr&eacute;es.
                </p>
              </div>
              <FaqList items={copy.faq} />
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
              <h2
                id="related-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                Autres solutions en {CATEGORY_LABELS[service.category].toLowerCase()}
              </h2>
              <ul className="mt-8 divide-y divide-border border-y border-border">
                {related.map((relatedService) => (
                  <li key={relatedService.slug}>
                    <Link
                      href={`/prestations/${relatedService.slug}`}
                      className="group flex items-center gap-4 rounded-sm py-5 focus-visible:focus-ring"
                    >
                      <ServiceGlyphBadge slug={relatedService.slug} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-lg text-foreground">{relatedService.name}</h3>
                        <p className="truncate text-sm text-muted-foreground">{relatedService.description}</p>
                      </div>
                      <ArrowRight
                        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-labelledby="cta-heading" className="bg-foreground text-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h2
                id="cta-heading"
                className="max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl"
              >
                {session
                  ? `Activez « ${service.name} » depuis votre tableau de bord`
                  : `Prêt à activer « ${service.name} » ?`}
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-background/70">
                Notre équipe l&apos;installe, la connecte à vos outils et la surveille chaque mois.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                {session ? "Choisir cette solution" : "Créer mon compte"}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background",
                })}
              >
                Poser une question
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
