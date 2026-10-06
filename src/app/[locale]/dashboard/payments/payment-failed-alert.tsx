import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BillingPortalButton } from "./billing-portal-button";

// Paiement refusé sur une ou plusieurs solutions : sur la vue d'ensemble et
// les deux onglets de la facturation, avec l'accès direct au moyen de paiement.
export function PaymentFailedAlert({
  names,
  organizationId,
  canOpenPortal,
}: {
  names: string[];
  organizationId: string;
  canOpenPortal: boolean;
}) {
  const t = useTranslations("Dashboard.subscriptions");
  if (names.length === 0) return null;
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{t("failingTitle")}</AlertTitle>
      <AlertDescription className="text-foreground">
        <p>{t("failing", { names: names.map((name) => t("quoted", { name })).join(", ") })}</p>
        {canOpenPortal && (
          <div className="mt-3">
            <BillingPortalButton organizationId={organizationId} variant="default" size="sm" />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
