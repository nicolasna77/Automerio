import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ClientServiceStatus } from "@/lib/catalog";

const STATUS_VARIANT: Record<
  ClientServiceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING_PAYMENT: "outline",
  CONFIGURING: "secondary",
  ACTIVE: "default",
  CANCELED: "destructive",
};

// Une solution active à laquelle il manque encore une action du client
// (numéro, connexion WhatsApp…) ne fonctionne pas : elle n'est pas affichée
// « Actif », ce qui contredirait l'avertissement placé à côté.
export function StatusBadge({
  status,
  setupPending = false,
  className,
}: {
  status: ClientServiceStatus;
  setupPending?: boolean;
  className?: string;
}) {
  if (status === "ACTIVE" && setupPending) {
    return (
      <Badge variant="outline" className={cn("border-attention/50 text-attention", className)}>
        À finaliser
      </Badge>
    );
  }
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
