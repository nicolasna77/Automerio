import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatPrice, type ClientServiceStatus, type ServiceDTO } from "@/lib/catalog";
import { formatPriceExcludingVat } from "@/lib/vat";
import { formatUsageCap } from "@/lib/usage-cap";
import { ServiceGlyphBadge } from "@/components/service-glyph";

export function ServiceCatalogGrid({
  services,
  statusByServiceId,
}: {
  services: ServiceDTO[];
  statusByServiceId: Record<string, ClientServiceStatus>;
}) {
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageSearch className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium text-foreground">Aucune solution disponible pour l&apos;instant</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Repassez bientôt, ou écrivez-nous si vous cherchez une automatisation en particulier.
          </p>
        </div>
      </div>
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
                <p className="border-t border-border pt-4 font-medium text-foreground tabular-nums">
                  {formatPrice(service.setupFeeCents, service.monthlyPriceCents)} TTC
                  <span className="block text-xs font-normal text-muted-foreground">
                    soit {formatPriceExcludingVat(service.setupFeeCents, service.monthlyPriceCents)} HT
                  </span>
                </p>
                {service.usageCap && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatUsageCap(service.usageCap)}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  href={`/dashboard/prestations/activer/${service.slug}`}
                  className={buttonVariants({
                    variant: status ? "outline" : "default",
                    className: "w-full",
                  })}
                >
                  {status ? "Activer à nouveau" : "Activer"}
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
