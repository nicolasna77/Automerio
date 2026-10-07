import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { Link } from "@/i18n/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ServiceGlyphBadge } from "@/components/service-glyph";
import { MESSAGING_SERVICE_SLUGS, TELEPHONY_SERVICE_SLUGS, type ServiceDTO } from "@/lib/catalog";

type GroupId = "phone" | "messaging" | "other";

function groupOf(slug: string): GroupId {
  if (TELEPHONY_SERVICE_SLUGS.has(slug)) return "phone";
  if (MESSAGING_SERVICE_SLUGS.has(slug)) return "messaging";
  return "other";
}

// Prix et volume identiques pour toutes les solutions d'un groupe (les
// messageries) : affichés une fois dans l'en-tête plutôt que sur chaque ligne.
function sharedOffer(services: ServiceDTO[]) {
  const [first, ...rest] = services;
  if (!first || rest.length === 0) return null;
  const same = rest.every(
    (s) =>
      s.monthlyPriceCents === first.monthlyPriceCents &&
      s.usageCap?.includedUnits === first.usageCap?.includedUnits &&
      s.usageCap?.unit === first.usageCap?.unit
  );
  return same ? first : null;
}

// Le catalogue, groupé par canal, en lignes compactes : nom, ce que fait la
// solution, prix et volume inclus. Ce que l'entreprise a déjà est sur
// l'onglet « Mes solutions » ; ici, toute solution s'active de la même façon.
// Le détail des tarifs (hors taxes, dépassement) se lit à l'activation.
export function ServiceCatalogGrid({
  services,
  showDetails,
}: {
  services: ServiceDTO[];
  // Les pages publiques des solutions sont fermées en mode présentation.
  showDetails: boolean;
}) {
  const t = useTranslations("Dashboard.services.catalog");
  if (services.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        tone="neutral"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  const groups = (["phone", "messaging", "other"] as const)
    .map((id) => ({ id, services: services.filter((s) => groupOf(s.slug) === id) }))
    .filter((group) => group.services.length > 0);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <CatalogGroup
          key={group.id}
          id={group.id}
          services={group.services}
          showDetails={showDetails}
        />
      ))}
    </div>
  );
}

function CatalogGroup({
  id,
  services,
  showDetails,
}: {
  id: GroupId;
  services: ServiceDTO[];
  showDetails: boolean;
}) {
  const t = useTranslations("Dashboard.services.catalog");
  const shared = sharedOffer(services);
  const headingId = `catalog-group-${id}`;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={headingId} className="text-base font-semibold text-foreground">
          {t(`groups.${id}`)}
        </h3>
        {shared && (
          <p className="text-sm text-muted-foreground">
            <OfferLine service={shared} />
            <span>{t("each")}</span>
          </p>
        )}
      </div>
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {services.map((service) => (
            <CatalogRow
              key={service.id}
              service={service}
              showOffer={!shared}
              showDetails={showDetails}
            />
          ))}
        </ul>
      </Card>
    </section>
  );
}

// « 25 € TTC/mois · 150 min incluses »
function OfferLine({ service }: { service: ServiceDTO }) {
  const t = useTranslations("Dashboard.services.catalog");
  const price = usePriceFormatter();
  if (service.monthlyPriceCents === null) return <span>{t("noSubscription")}</span>;
  return (
    <>
      <span className="font-medium text-foreground tabular-nums">
        {price.perMonthWithVat(service.monthlyPriceCents)}
      </span>
      {service.usageCap && (
        <span className="tabular-nums">
          {" · "}
          {price.included(service.usageCap)}
        </span>
      )}
    </>
  );
}

function CatalogRow({
  service,
  showOffer,
  showDetails,
}: {
  service: ServiceDTO;
  showOffer: boolean;
  showDetails: boolean;
}) {
  const t = useTranslations("Dashboard.services.catalog");

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ServiceGlyphBadge slug={service.slug} />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{service.name}</h4>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{service.description}</p>
          {showOffer && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <OfferLine service={service} />
            </p>
          )}
        </div>
      </div>

      <div className="pl-12 md:shrink-0 md:pl-0">
        <div className="flex items-center gap-2">
          {showDetails && (
            <Link
              href={`/services/${service.slug}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("details")}
              <span className="sr-only"> {service.name}</span>
            </Link>
          )}
          <Link
            href={`/dashboard/services/activate/${service.slug}`}
            className={buttonVariants({ size: "sm" })}
          >
            {t("activate")}
            <span className="sr-only"> {service.name}</span>
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </li>
  );
}
