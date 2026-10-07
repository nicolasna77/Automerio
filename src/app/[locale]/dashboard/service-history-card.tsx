import { History } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import type { ServiceEventDTO } from "@/lib/catalog";
import { HISTORY_SECTION_ID } from "./billing-section";

// Onglet « Historique » des réglages : les étapes de la solution (paiement,
// activation, changements de réglages, notes de l'équipe), en lecture seule.
export function ServiceHistoryCard({ events }: { events: ServiceEventDTO[] }) {
  const t = useTranslations("Dashboard.settingsCards.history");
  return (
    <Card id={HISTORY_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ServiceTimelineList events={events} />
      </CardContent>
    </Card>
  );
}
