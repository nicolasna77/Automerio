import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Check, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceCategory, ServiceDTO } from "@/lib/catalog";
import type { PriceFormatter } from "@/lib/price-format";
import { getPriceFormatter } from "@/lib/price-format-server";
import { isWaitlistMode } from "@/lib/launch-mode";
import { ServiceGlyphBadge } from "@/components/service-glyph";

const INCLUDED = ["install", "config", "tests", "adjust", "commitment"] as const;

const SERVICE_SECTION_CATEGORIES: ServiceCategory[] = [
  "COMMUNICATION",
  "INFORMATION",
];

function PriceList({
  service,
  price,
  subscriptionLabel,
}: {
  service: ServiceDTO;
  price: PriceFormatter;
  subscriptionLabel: string;
}) {
  return (
    <>
      <dl className="space-y-1.5 border-t border-border pt-4 text-xs">
        {service.monthlyPriceCents !== null && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{subscriptionLabel}</dt>
            <dd className="text-right font-mono tabular-nums text-foreground">
              {price.perMonthWithVat(service.monthlyPriceCents)}
              <span className="block text-[0.6875rem] font-normal text-muted-foreground">
                {price.excludingVatSuffix(service.monthlyPriceCents)}
              </span>
            </dd>
          </div>
        )}
      </dl>
      {service.usageCap && (
        <p className="pt-2.5 text-xs leading-relaxed text-muted-foreground">
          {price.usageCap(service.usageCap)}
        </p>
      )}
    </>
  );
}

function ServiceCard({
  service,
  price,
  subscriptionLabel,
  linked,
}: {
  service: ServiceDTO;
  price: PriceFormatter;
  subscriptionLabel: string;
  linked: boolean;
}) {
  const card = (
      <Card className="flex h-full flex-col transition-colors hover:bg-muted/40 group-focus-visible/service:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <ServiceGlyphBadge slug={service.slug} size="md" className="mb-2" />
            {linked && <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </div>
          <CardTitle>{service.name}</CardTitle>
          <CardDescription>{service.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <PriceList service={service} price={price} subscriptionLabel={subscriptionLabel} />
        </CardContent>
      </Card>
  );
  if (!linked) return <div id={service.slug}>{card}</div>;
  return (
    <Link
      href={`/services/${service.slug}`}
      id={service.slug}
      className="group/service block scroll-mt-20 rounded-lg text-inherit no-underline outline-none focus-visible:focus-ring"
    >
      {card}
    </Link>
  );
}

export async function ServicesSection({ services }: { services: ServiceDTO[] }) {
  const waitlist = isWaitlistMode();
  const [t, tCatalog, price] = await Promise.all([
    getTranslations("Home.services"),
    getTranslations("Catalog"),
    getPriceFormatter(),
  ]);
  const categories = SERVICE_SECTION_CATEGORIES.map((category) => ({
    category,
    categoryServices: services.filter((s) => s.category === category),
  })).filter(({ categoryServices }) => categoryServices.length > 0);

  return (
    <section id="services" aria-labelledby="services-heading" className="scroll-mt-16 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="services-heading" className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("lead")}
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <p className="text-sm font-medium text-foreground">{t("included.label")}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {INCLUDED.map((key) => (
              <li
                key={key}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              >
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {t(`included.items.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {categories.map(({ category, categoryServices }, index) => {
          return (
            <div key={category} className={index > 0 ? "mt-14" : "mt-12"}>
              <div className="mb-5">
                <div className="mx-auto max-w-2xl text-center">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    {tCatalog(`categories.${category}`)}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {tCatalog(`categoryDescriptions.${category}`)}
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryServices.map((service) => (
                  <ServiceCard
                    key={service.slug}
                    service={service}
                    price={price}
                    subscriptionLabel={t("subscription")}
                    linked={!waitlist}
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
