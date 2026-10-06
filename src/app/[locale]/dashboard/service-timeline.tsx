import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import type { ServiceEventDTO } from "@/lib/catalog";

export function ServiceTimeline({ events }: { events: ServiceEventDTO[] }) {
  const t = useTranslations("Dashboard.service");
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">{t("history")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ServiceTimelineList events={events} />
      </CardContent>
    </Card>
  );
}
