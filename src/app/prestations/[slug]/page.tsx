import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { JsonLd, priceSummary, serviceSchema } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, TELEPHONY_SERVICE_SLUGS, formatCents } from "@/lib/catalog";
import { getCatalog, getServiceBySlug } from "@/lib/get-catalog";
import { SERVICE_ICONS } from "@/lib/service-icons";

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
    openGraph: { type: "website", title: service.name, description, url },
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

export default async function PrestationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [session, allServices] = await Promise.all([getSession(), getCatalog()]);
  const Icon = SERVICE_ICONS[service.slug] ?? Bot;
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const configFields = service.configFields.filter(
    (field) => !GENERIC_FIELD_KEYS.has(field.key)
  );
  const related = allServices
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd data={serviceSchema(service)} />
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <Link
              href="/#prestations"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Toutes les solutions
            </Link>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[service.category]}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  {service.name}
                </h1>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  {service.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {session ? (
                    <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                      Aller à mon tableau de bord
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                        Créer mon compte
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                      <Link
                        href="/login"
                        className={buttonVariants({ size: "lg", variant: "secondary" })}
                      >
                        Se connecter
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <aside
                aria-labelledby="tarif-heading"
                className="rounded-xl border border-border bg-card p-6 lg:self-start"
              >
                <h2 id="tarif-heading" className="text-sm font-medium text-muted-foreground">
                  Tarif
                </h2>

                <dl className="mt-4 divide-y divide-border">
                  {service.setupFeeCents !== null && (
                    <div className="pb-4">
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.setupFeeCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">
                        TTC, &agrave; l&apos;installation
                      </dt>
                    </div>
                  )}
                  {service.monthlyPriceCents !== null && (
                    <div className="py-4 first:pt-0">
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.monthlyPriceCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">TTC par mois</dt>
                    </div>
                  )}
                  {service.usageCapLabel && (
                    <div className="py-4">
                      <dt className="text-sm text-muted-foreground">Compris</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {service.usageCapLabel}
                      </dd>
                    </div>
                  )}
                </dl>

                <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                  Sans engagement, r&eacute;siliable &agrave; tout moment.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {isTelephony && (
          <section aria-labelledby="numero-heading" className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="numero-heading"
                className="text-2xl font-semibold tracking-tight text-balance text-foreground"
              >
                Vous gardez votre num&eacute;ro actuel
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                Aucune portabilit&eacute;, aucune interruption de service : vos
                clients continuent d&apos;appeler le num&eacute;ro qu&apos;ils
                connaissent d&eacute;j&agrave;.
              </p>
              <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
                {PHONE_FORWARDING_STEPS.map((step, index) => (
                  <li key={step.title} className="border-t border-border pt-4">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {configFields.length > 0 && (
          <section aria-labelledby="config-heading" className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="config-heading"
                className="text-2xl font-semibold tracking-tight text-balance text-foreground"
              >
                Ce que vous configurez &agrave; l&apos;activation
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                L&apos;&eacute;quipe Automerio installe et connecte la solution —
                voici les informations qu&apos;on vous demande pour la
                personnaliser &agrave; votre activit&eacute;.
              </p>
              <dl className="mt-10 grid gap-x-12 sm:grid-cols-2">
                {configFields.map((field) => (
                  <div key={field.key} className="border-t border-border py-4">
                    <dt className="font-medium text-foreground">{field.label}</dt>
                    {field.helpText && (
                      <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {field.helpText}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="border-b border-border"
          >
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="related-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                Autres solutions en {CATEGORY_LABELS[service.category].toLowerCase()}
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {related.map((relatedService) => {
                  const RelatedIcon = SERVICE_ICONS[relatedService.slug] ?? Bot;
                  return (
                    <Card
                      key={relatedService.slug}
                      className="relative h-full transition-colors has-[a:hover]:bg-card/70 has-[a:focus-visible]:bg-card/70 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/30"
                    >
                      <CardHeader>
                        <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <RelatedIcon className="size-4" aria-hidden="true" />
                        </span>
                        <h3 className="font-heading text-base font-medium">
                          <Link
                            href={`/prestations/${relatedService.slug}`}
                            className="text-inherit no-underline outline-none after:absolute after:inset-0"
                          >
                            {relatedService.name}
                          </Link>
                        </h3>
                        <CardDescription className="line-clamp-2">
                          {relatedService.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section
          aria-labelledby="cta-heading"
          className="bg-muted/40"
        >
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2
              id="cta-heading"
              className="text-2xl font-semibold tracking-tight text-balance text-foreground"
            >
              {session
                ? `Activez « ${service.name} » depuis votre tableau de bord`
                : `Prêt à activer « ${service.name} » ?`}
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Notre équipe l&apos;installe, la connecte à vos outils et la
              surveille chaque mois.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={session ? "/dashboard/prestations" : "/signup"}
                className={buttonVariants({ size: "lg" })}
              >
                {session ? "Choisir cette solution" : "Créer mon compte"}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg", variant: "secondary" })}
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
