import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPriceFormatter } from "@/lib/price-format-server";
import { organizationCustomerId } from "@/lib/organization-billing";
import { isNearQuota } from "@/lib/quota";
import { isRunning } from "@/lib/subscriptions";
import { overageUnits } from "@/lib/usage-cap";
import { BILLING_SECTION_ID } from "./billing-section";
import { getOverviewSubscriptions } from "./overview-data";
import { PaymentFailedAlert } from "./payments/payment-failed-alert";

// En tête de la vue d'ensemble, ce qui demande une action : un paiement
// refusé, un forfait presque consommé ou dépassé. Rien quand tout va bien.
// Les mises en service à terminer restent sur leur ligne, dans la liste des
// solutions juste en dessous.
export async function OverviewAttention({ organizationId }: { organizationId: string }) {
  const [subscriptions, customerId, t, price] = await Promise.all([
    getOverviewSubscriptions(organizationId),
    organizationCustomerId(organizationId),
    getTranslations("Dashboard.overview.attention"),
    getPriceFormatter(),
  ]);
  const running = subscriptions.filter(isRunning);
  const failing = running.filter((subscription) => subscription.paymentFailedAt !== null);
  const quotaAlerts = running.flatMap((subscription) => {
    const { cap, usage } = subscription;
    if (!cap || !usage) return [];
    const over = overageUnits(usage.consumedUnits, cap) > 0;
    if (!over && !isNearQuota(usage.consumedUnits, cap.includedUnits)) return [];
    return [{ subscription, cap, consumedUnits: usage.consumedUnits }];
  });

  if (failing.length === 0 && quotaAlerts.length === 0) return null;
  const anyOver = quotaAlerts.some(({ cap, consumedUnits }) => overageUnits(consumedUnits, cap) > 0);

  return (
    <div className="space-y-3">
      <PaymentFailedAlert
        names={failing.map((subscription) => subscription.name)}
        organizationId={organizationId}
        canOpenPortal={Boolean(customerId)}
      />
      {quotaAlerts.length > 0 && (
        // Un avertissement, pas une erreur : annoncé poliment.
        <Alert role="status">
          <TriangleAlert aria-hidden="true" className="text-attention" />
          <AlertTitle>{anyOver ? t("quotaOverTitle") : t("quotaTitle")}</AlertTitle>
          <AlertDescription className="text-foreground">
            <ul className="space-y-1.5">
              {quotaAlerts.map(({ subscription, cap, consumedUnits }) => {
                const over = overageUnits(consumedUnits, cap);
                return (
                  <li key={subscription.clientServiceId}>
                    {over > 0
                      ? t("quotaOver", { name: subscription.name, units: price.usageUnits(over, cap.unit) })
                      : t("quotaNear", {
                          name: subscription.name,
                          consumed: price.usageUnits(consumedUnits, cap.unit),
                          included: price.usageUnits(cap.includedUnits, cap.unit),
                        })}{" "}
                    <Link
                      href={`/dashboard/services/${subscription.clientServiceId}/configuration#${BILLING_SECTION_ID}`}
                      className="font-medium text-primary"
                    >
                      {t("adjust")}
                      <span className="sr-only"> {t("adjustFor", { name: subscription.name })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
