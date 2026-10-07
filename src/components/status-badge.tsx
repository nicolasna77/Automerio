import { Badge } from "@/components/ui/badge";
import { useLabels } from "@/hooks/use-labels";
import { LIVE_STATUSES, type ClientServiceStatus } from "@/lib/catalog";

const STATUS_VARIANT: Record<
  ClientServiceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING_PAYMENT: "outline",
  CONFIGURING: "secondary",
  ACTIVE: "default",
  CANCELED: "destructive",
};

// pausedAt : une solution payée que le client a mise en pause s'affiche
// « En pause » ; la ligne qui la décrit garde son statut de mise en service.
export function StatusBadge({
  status,
  pausedAt = null,
  className,
}: {
  status: ClientServiceStatus;
  pausedAt?: Date | null;
  className?: string;
}) {
  const labels = useLabels();
  const paused = pausedAt !== null && (LIVE_STATUSES as readonly ClientServiceStatus[]).includes(status);
  return (
    <Badge variant={paused ? "outline" : STATUS_VARIANT[status]} className={className}>
      {paused ? labels.pausedStatus() : labels.status(status)}
    </Badge>
  );
}
