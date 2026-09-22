import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
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
import { excludingVatSuffix } from "@/lib/vat";
import { bentoLayout, type BentoSize } from "@/lib/bento-layout";
import { formatUsageCap } from "@/lib/usage-cap";
import { getServiceCopy } from "@/lib/service-copy";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { cn } from "@/lib/utils";

const SERVICE_SECTION_CATEGORIES: ServiceCategory[] = [
  "COMMUNICATION",
  "INFORMATION",
];

const SPANS: Record<BentoSize, string> = {
  featured: "sm:col-span-2 lg:row-span-2",
  wide: "sm:col-span-2",
  small: "",
};

function PriceList({ service }: { service: ServiceDTO }) {
  return (
    <>
      <dl className="space-y-1.5 border-t border-border pt-4 text-xs">
        {service.setupFeeCents !== null && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Mise en place</dt>
            <dd className="text-right tabular-nums text-foreground">
              {formatCents(service.setupFeeCents)} TTC
              <span className="block text-[0.6875rem] font-normal text-muted-foreground">
                {excludingVatSuffix(service.setupFeeCents)}
              </span>
            </dd>
          </div>
        )}
        {service.monthlyPriceCents !== null && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Abonnement</dt>
            <dd className="text-right tabular-nums text-foreground">
              {formatCents(service.monthlyPriceCents)}/mois TTC
              <span className="block text-[0.6875rem] font-normal text-muted-foreground">
                {excludingVatSuffix(service.monthlyPriceCents)}
              </span>
            </dd>
          </div>
        )}
      </dl>
      {service.usageCap && (
        <p className="pt-2.5 text-xs leading-relaxed text-muted-foreground">
          {formatUsageCap(service.usageCap)}
        </p>
      )}
    </>
  );
}

function ServiceCard({
  service,
  size,
}: {
  service: ServiceDTO;
  size: BentoSize;
}) {
  const copy = size === "featured" ? getServiceCopy(service.slug) : null;
  const benefits = copy?.benefits ?? [];
  const audiences = copy?.useCases?.map((useCase) => useCase.audience) ?? [];

  return (
    <Link
      href={`/prestations/${service.slug}`}
      id={service.slug}
      className={cn(
        "group/service block scroll-mt-20 rounded-4xl text-inherit no-underline outline-none focus-visible:focus-ring",
        SPANS[size]
      )}
    >
      <Card className="flex h-full flex-col transition-colors hover:bg-muted/40 group-focus-visible/service:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <ServiceGlyphBadge
              slug={service.slug}
              size={size === "featured" ? "lg" : "md"}
              className="mb-2"
            />
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <CardTitle className={size === "featured" ? "text-xl" : undefined}>
            {service.name}
          </CardTitle>
          <CardDescription className={size === "featured" ? "text-base" : undefined}>
            {copy?.intro ?? service.description}
          </CardDescription>
        </CardHeader>

        {benefits.length > 0 && (
          <CardContent>
            <ul className="space-y-2.5 text-sm">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{benefit.title}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}

        {audiences.length > 0 && (
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {audiences.map((audience) => (
                <li
                  key={audience}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {audience}
                </li>
              ))}
            </ul>
          </CardContent>
        )}

        <CardContent className="mt-auto">
          <PriceList service={service} />
        </CardContent>
      </Card>
    </Link>
  );
}

export function ServicesSection({ services }: { services: ServiceDTO[] }) {
  const categories = SERVICE_SECTION_CATEGORIES.map((category) => ({
    category,
    categoryServices: services.filter((s) => s.category === category),
  })).filter(({ categoryServices }) => categoryServices.length > 0);

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

        {categories.map(({ category, categoryServices }, index) => {
          const sizes = bentoLayout(categoryServices.length);

          return (
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

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-4">
                {categoryServices.map((service, position) => (
                  <ServiceCard
                    key={service.slug}
                    service={service}
                    size={sizes[position]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
