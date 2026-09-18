import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import { ServiceFacts, hasServiceFacts } from "@/components/service-facts";
import { StatusBadge } from "@/components/status-badge";
import { ServiceProgress } from "@/app/dashboard/service-progress";
import { formatDate, type MyServiceDTO } from "@/lib/catalog";
import { ConnectionSummary } from "./connection-summary";

export function ServiceHistory({ items }: { items: MyServiceDTO[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Ce que voit le client
      </h2>
      <Card>
        <CardContent className="divide-y divide-border">
          {items.map((item, index) => {
            const showFacts = hasServiceFacts(item, true);
            return (
              <details
                key={item.clientServiceId}
                open={index === 0}
                className="group py-3 first:pt-0 last:pb-0"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl outline-none focus-visible:focus-ring">
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    {item.name !== item.service.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.service.name}
                      </span>
                    )}
                  </span>
                  <StatusBadge status={item.status} />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.events.length > 0
                      ? `dernier événement le ${formatDate(item.events[0].createdAt)}`
                      : "aucun événement"}
                  </span>
                </summary>

                <div className="mt-4 space-y-6 pl-6">
                  {item.status !== "CANCELED" && (
                    <ServiceProgress status={item.status} />
                  )}

                  {item.adminNote && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-medium text-primary">
                        Note affichée au client
                      </p>
                      <p className="mt-1 text-sm text-foreground">{item.adminNote}</p>
                    </div>
                  )}

                  <ConnectionSummary item={item} />

                  {showFacts && (
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-foreground">
                        Configuration
                      </h3>
                      <ServiceFacts item={item} />
                    </div>
                  )}

                  {item.events.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-medium text-foreground">
                        Historique
                      </h3>
                      <ServiceTimelineList events={item.events} />
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
