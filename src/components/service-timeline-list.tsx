import { useLabels } from "@/hooks/use-labels";
import { type ServiceEventDTO } from "@/lib/catalog";

function formatEventDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ServiceTimelineList({ events }: { events: ServiceEventDTO[] }) {
  const labels = useLabels();
  return (
    <ol>
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < events.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-0 left-[4.5px] w-px bg-border"
            />
          )}
          <span
            aria-hidden="true"
            className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {labels.serviceEvent(event.type)}
              </p>
              <time
                dateTime={event.createdAt.toISOString()}
                className="text-xs whitespace-nowrap text-muted-foreground"
              >
                {formatEventDateTime(event.createdAt)}
              </time>
            </div>
            {event.message && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.type === "NOTE_ADDED" ? `« ${event.message} »` : event.message}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
