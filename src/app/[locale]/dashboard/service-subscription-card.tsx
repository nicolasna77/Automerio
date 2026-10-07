import { useTranslations } from "next-intl";
import { useLabels } from "@/hooks/use-labels";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyPrice } from "@/components/monthly-price";
import { isRunning, type MySubscription } from "@/lib/subscriptions";
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
  const t = useTranslations("Dashboard.service.subscription");
  const labels = useLabels();
  const price = usePriceFormatter();
  const running = isRunning(subscription);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle as="h2" className="text-base">{t("title")}</CardTitle>
        <MonthlyPrice cents={subscription.monthlyPriceCents} className="shrink-0 text-right" />
      </CardHeader>
      <CardContent className="space-y-4">
        {running && (
          <p className="text-sm text-muted-foreground">{labels.period(subscription.period)}</p>
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
            {t("cap", { cap: price.usageCap(subscription.cap) })}
          </p>
        ) : (
          running && (
            <p className="text-sm text-muted-foreground">
              {t("noQuota")}
            </p>
          )
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {labels.nextCharge(subscription, price.withVat(subscription.monthlyPriceCents))}
          </p>
          {settingsHref && running ? (
            <Link
              href={settingsHref}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Settings className="size-3.5" aria-hidden="true" />
              {t("adjust")}
            </Link>
          ) : (
            <Link
              href="/dashboard/subscriptions"
              className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
            >
              {t("manage")}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
