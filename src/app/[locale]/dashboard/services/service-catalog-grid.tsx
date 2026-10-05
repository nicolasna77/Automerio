import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { ClientServiceStatus, ServiceDTO } from "@/lib/catalog";
import { EmptyState } from "@/components/empty-state";
import { MonthlyPrice } from "@/components/monthly-price";
import { formatUsageCap } from "@/lib/usage-cap";
import { ServiceGlyphBadge } from "@/components/service-glyph";

export function ServiceCatalogGrid({
  services,
  statusByServiceId,
}: {
  services: ServiceDTO[];
  statusByServiceId: Record<string, ClientServiceStatus>;
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

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const status = statusByServiceId[service.id];
        return (
          <li key={service.id}>
            <Card className="h-full">
              <CardHeader>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <ServiceGlyphBadge slug={service.slug} />
                  {status && <StatusBadge status={status} />}
                </div>
                <CardTitle as="h3" className="text-base">{service.name}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="border-t border-border pt-4">
                  {service.monthlyPriceCents === null ? (
                    <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
                  ) : (
                    <MonthlyPrice cents={service.monthlyPriceCents} className="text-base" />
                  )}
                </div>
                {service.usageCap && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatUsageCap(service.usageCap)}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  href={`/dashboard/services/activate/${service.slug}`}
                  className={buttonVariants({
                    variant: status ? "outline" : "default",
                    className: "w-full",
                  })}
                >
                  {status ? t("activateAgain") : t("activate")}
                  <span className="sr-only"> {service.name}</span>
                </Link>
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
