import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  formatCents,
  type ServiceCategory,
  type ServiceDTO,
} from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import { ServiceGlyphBadge } from "@/components/service-glyph";

const SERVICE_SECTION_CATEGORIES: ServiceCategory[] = [
  "COMMUNICATION",
  "INFORMATION",
];

function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <Link
      href={`/prestations/${service.slug}`}
      id={service.slug}
      className="group/service block scroll-mt-20 rounded-4xl text-inherit no-underline outline-none focus-visible:focus-ring"
    >
      <Card className="flex h-full flex-col transition-colors hover:bg-muted/40 group-focus-visible/service:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <ServiceGlyphBadge slug={service.slug} className="mb-2" />
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <CardTitle>{service.name}</CardTitle>
          <CardDescription>{service.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <dl className="space-y-1.5 border-t border-border pt-4 text-xs">
            {service.setupFeeCents !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Mise en place</dt>
                <dd className="tabular-nums text-foreground">
                  {formatCents(service.setupFeeCents)}
                </dd>
              </div>
            )}
            {service.monthlyPriceCents !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Abonnement</dt>
                <dd className="tabular-nums text-foreground">
                  {formatCents(service.monthlyPriceCents)}/mois TTC
                </dd>
              </div>
            )}
          </dl>
          {service.usageCap && (
            <p className="pt-2.5 text-xs leading-relaxed text-muted-foreground">
              {formatUsageCap(service.usageCap)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function ServicesSection({ services }: { services: ServiceDTO[] }) {
  const categories = SERVICE_SECTION_CATEGORIES.map((category) => ({
    category,
    categoryServices: services.filter((s) => s.category === category),
  }))
    .filter(({ categoryServices }) => categoryServices.length > 0);

  return (
    <section id="prestations" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            Choisissez ce que vous voulez arrêter de faire vous-même
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Prix affichés, sans engagement, activation en ligne quand vous êtes
            prêt.
          </p>
        </div>

        {categories.map(({ category, categoryServices }, index) => (
          <div key={category} className={index > 0 ? "mt-14" : "mt-12"}>
            <div className="mb-5">
              <div className="max-w-2xl">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {CATEGORY_LABELS[category]}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categoryServices.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
