import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyph } from "@/components/service-glyph";
import { formatCents } from "@/lib/catalog";
import {
  describeNextCharge,
  describePeriod,
  isRunning,
  type MySubscription,
} from "@/lib/subscriptions";
import { UsageGauge } from "./usage-gauge";
import { SubscriptionActions } from "./subscription-actions";

export function SubscriptionCard({
  subscription,
}: {
  subscription: MySubscription;
}) {
  const running = isRunning(subscription);

  // Une carte resiliee n'a ni periode ni quota a montrer : on la laisse vide
  // plutot que d'y reserver une place blanche.
  const body = [
    subscription.paymentFailedAt && (
      <p key="payment-failed" className="flex items-start gap-2 text-sm text-foreground">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        Le dernier paiement a été refusé. Mettez à jour votre moyen de paiement
        pour éviter une interruption.
      </p>
    ),
    running && (
      <p key="period" className="text-sm text-muted-foreground">
        {describePeriod(subscription)}
      </p>
    ),
    subscription.cap && subscription.usage ? (
      <UsageGauge
        key="gauge"
        cap={subscription.cap}
        consumedUnits={subscription.usage.consumedUnits}
        overageCents={subscription.usage.overageCents}
      />
    ) : (
      running &&
      !subscription.cap && (
        <p key="no-cap" className="text-sm text-muted-foreground">
          Cet abonnement n&apos;a pas de quota d&apos;usage : le montant mensuel ne
          bouge pas.
        </p>
      )
    ),
  ].filter(Boolean);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        {/* min-w-0 : sans cela un nom long deborde de la carte, qui coupe. */}
        <div className="flex min-w-0 items-start gap-3">
          <ServiceGlyph
            slug={subscription.serviceSlug}
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="min-w-0 text-base font-semibold text-foreground">
                <Link
                  href={`/dashboard/services/${subscription.clientServiceId}`}
                  className="hover:underline focus-visible:underline"
                >
                  {subscription.name}
                </Link>
              </h3>
              <StatusBadge status={subscription.status} />
            </div>
            {subscription.name !== subscription.serviceName && (
              <p className="text-sm text-muted-foreground">{subscription.serviceName}</p>
            )}
          </div>
          <p className="shrink-0 text-sm tabular-nums text-foreground">
            {formatCents(subscription.monthlyPriceCents)}
            <span className="text-muted-foreground">/mois</span>
          </p>
        </div>
      </CardHeader>

      {body.length > 0 && <CardContent className="space-y-4">{body}</CardContent>}

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{describeNextCharge(subscription)}</p>
        <SubscriptionActions subscription={subscription} />
      </CardFooter>
    </Card>
  );
}
