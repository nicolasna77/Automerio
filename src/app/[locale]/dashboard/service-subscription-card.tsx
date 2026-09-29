import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/catalog";
import { formatUsageCap } from "@/lib/usage-cap";
import {
  describeNextCharge,
  describePeriod,
  isRunning,
  type MySubscription,
} from "@/lib/subscriptions";
import { UsageGauge } from "./subscriptions/usage-gauge";
import { ChangeQuotaDialog } from "./change-quota-dialog";
import { BillingPortalButton } from "./payments/billing-portal-button";
import { excludingVatSuffix } from "@/lib/vat";

export function ServiceSubscriptionCard({
  subscription,
  organizationId,
}: {
  subscription: MySubscription;
  organizationId?: string;
}) {
  const running = isRunning(subscription);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle as="h2" className="text-base">Abonnement</CardTitle>
        <p className="shrink-0 text-right text-sm tabular-nums text-foreground">
          {formatCents(subscription.monthlyPriceCents)} TTC
          <span className="text-muted-foreground">/mois</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {excludingVatSuffix(subscription.monthlyPriceCents)}
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {running && (
          <p className="text-sm text-muted-foreground">{describePeriod(subscription)}</p>
        )}

        {running && (
          <div className="flex flex-wrap gap-2">
            {subscription.tier && subscription.cap && (
              <ChangeQuotaDialog
                clientServiceId={subscription.clientServiceId}
                tier={subscription.tier}
                currentUnits={subscription.cap.includedUnits}
              />
            )}
            {organizationId && (
              <BillingPortalButton organizationId={organizationId} size="sm" />
            )}
          </div>
        )}

        {subscription.cap && subscription.usage ? (
          <UsageGauge
            cap={subscription.cap}
            consumedUnits={subscription.usage.consumedUnits}
            overageCents={subscription.usage.overageCents}
          />
        ) : subscription.cap ? (
          <p className="text-sm text-muted-foreground">
            Plafond d&apos;usage : {formatUsageCap(subscription.cap)}
          </p>
        ) : (
          running && (
            <p className="text-sm text-muted-foreground">
              Cet abonnement n&apos;a pas de quota d&apos;usage : le montant mensuel
              ne bouge pas.
            </p>
          )
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {describeNextCharge(subscription)}
          </p>
          <Link
            href="/dashboard/subscriptions"
            className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
          >
            Gérer mes abonnements
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
