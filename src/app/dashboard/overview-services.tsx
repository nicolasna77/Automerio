import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { SETUP_ANCHOR, setupAction } from "@/lib/catalog";
import { ServiceGlyph } from "@/components/service-glyph";
import { toMyServiceDTO } from "./get-my-service";

export async function OverviewServices({
  organizationId,
}: {
  organizationId: string;
}) {
  const rows = await db.clientService.findMany({
    where: { organizationId, status: { not: "CANCELED" } },
    include: { service: true, events: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return null;

  const items = rows.map(toMyServiceDTO);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <CardTitle className="text-base">Vos solutions</CardTitle>
          <Link
            href="/dashboard/prestations"
            className="relative touch-hitbox rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
          >
            Tout voir
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const action = setupAction(item);
            return (
              <li key={item.clientServiceId} className="relative py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <ServiceGlyph
                    slug={item.service.slug}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 min-w-0 font-medium text-foreground">
                        <Link
                          href={`/dashboard/services/${item.clientServiceId}`}
                          className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
                        >
                          {item.name}
                          <span className="sr-only"> — voir le détail</span>
                        </Link>
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <StatusBadge status={item.status} />
                        <ChevronRight
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    {action && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <p className="flex items-start gap-1.5 text-sm text-foreground">
                          <TriangleAlert
                            className="mt-0.5 size-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          {action.hint}
                        </p>
                        <Link
                          href={`/dashboard/services/${item.clientServiceId}#${SETUP_ANCHOR}`}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                            className: "relative z-10",
                          })}
                        >
                          {action.cta}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
