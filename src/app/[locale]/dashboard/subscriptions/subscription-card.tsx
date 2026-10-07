import { Link } from "@/i18n/navigation";
import { pausesAtLimit } from "@/lib/usage-cap";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { useLabels } from "@/hooks/use-labels";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ServiceGlyph } from "@/components/service-glyph";
import { MonthlyPrice } from "@/components/monthly-price";
import { isRunning, type MySubscription } from "@/lib/subscriptions";
import { UsageGauge } from "./usage-gauge";
import { SubscriptionActions } from "./subscription-actions";

export function SubscriptionCard({
  subscription,
}: {
  subscription: MySubscription;
}) {
  const t = useTranslations("Dashboard");
  const labels = useLabels();
  const price = usePriceFormatter();
  const running = isRunning(subscription);

  const body = [
    subscription.paymentFailedAt && (
      <p key="payment-failed" className="flex items-start gap-2 text-sm text-foreground">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        {t("subscriptions.paymentFailed")}
      </p>
    ),
    running && (
      <p key="period" className="text-sm text-muted-foreground">
        {labels.period(subscription.period)}
      </p>
    ),
    subscription.cap && subscription.usage ? (
      <UsageGauge
        key="gauge"
        cap={subscription.cap}
        consumedUnits={subscription.usage.consumedUnits}
        overageCents={subscription.usage.overageCents}
        pausesAtLimit={pausesAtLimit(subscription.cap, subscription.overageAllowed)}
      />
    ) : (
      running &&
      !subscription.cap && (
        <p key="no-cap" className="text-sm text-muted-foreground">
          {t("service.subscription.noQuota")}
        </p>
      )
    ),
  ].filter(Boolean);

  return (
    <Card className="shadow-sm">
      <CardHeader>
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
          <MonthlyPrice cents={subscription.monthlyPriceCents} className="shrink-0 text-right" />
        </div>
      </CardHeader>

      {body.length > 0 && <CardContent className="space-y-4">{body}</CardContent>}

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{labels.nextCharge(subscription, price.withVat(subscription.monthlyPriceCents))}</p>
        <SubscriptionActions subscription={subscription} running={running} />
      </CardFooter>
    </Card>
  );
}
