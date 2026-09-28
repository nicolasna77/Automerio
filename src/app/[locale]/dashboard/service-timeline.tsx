import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTimelineList } from "@/components/service-timeline-list";
import type { ServiceEventDTO } from "@/lib/catalog";

export function ServiceTimeline({ events }: { events: ServiceEventDTO[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">Historique</CardTitle>
      </CardHeader>
      <CardContent>
        <ServiceTimelineList events={events} />
      </CardContent>
    </Card>
  );
}
