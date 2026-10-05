import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyPrice } from "@/components/monthly-price";
import { formatUsageCap } from "@/lib/usage-cap";
import {
  describeNextCharge,
  describePeriod,
  isRunning,
  type MySubscription,
} from "@/lib/subscriptions";
import { UsageGauge } from "./subscriptions/usage-gauge";
import { Settings } from "lucide-react";

// L'abonnement sur la page de la solution, en lecture : on ajuste le volume
// et le moyen de paiement dans les réglages (lien « Ajuster l'abonnement »).
export function ServiceSubscriptionCard({
  subscription,
  settingsHref,
}: {
  subscription: MySubscription;
  settingsHref: string | null;
}) {
  const running = isRunning(subscription);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle as="h2" className="text-base">Abonnement</CardTitle>
        <MonthlyPrice cents={subscription.monthlyPriceCents} className="shrink-0 text-right" />
      </CardHeader>
      <CardContent className="space-y-4">
        {running && (
          <p className="text-sm text-muted-foreground">{describePeriod(subscription)}</p>
        )}

        {subscription.cap && subscription.usage ? (
          <UsageGauge
            cap={subscription.cap}
            consumedUnits={subscription.usage.consumedUnits}
            overageCents={subscription.usage.overageCents}
            pausesAtLimit={!subscription.overageAllowed}
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
          {settingsHref && running ? (
            <Link
              href={settingsHref}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Settings className="size-3.5" aria-hidden="true" />
              Ajuster l&apos;abonnement
            </Link>
          ) : (
            <Link
              href="/dashboard/subscriptions"
              className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
            >
              Gérer mes abonnements
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
