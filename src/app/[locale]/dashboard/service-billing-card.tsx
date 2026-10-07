import { CreditCard } from "lucide-react";
import { pausesAtLimit } from "@/lib/usage-cap";
import { useLabels } from "@/hooks/use-labels";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyPrice } from "@/components/monthly-price";
import { isRunning, type MySubscription } from "@/lib/subscriptions";
import { ChangeQuotaDialog } from "./change-quota-dialog";
import { OverageSwitch } from "./overage-switch";
import { BillingPortalButton } from "./payments/billing-portal-button";
import { BILLING_SECTION_ID } from "./billing-section";

// Section « Abonnement » des réglages d'une solution : ajuster le volume et
// gérer le moyen de paiement. Ces actions s'appliquent tout de suite, à la
// différence des autres réglages qui attendent « Enregistrer ».
export function ServiceBillingCard({
  subscription,
  organizationId,
}: {
  subscription: MySubscription;
  organizationId: string;
}) {
  const t = useTranslations("Dashboard.settingsCards.billing");
  const labels = useLabels();
  const price = usePriceFormatter();
  const running = isRunning(subscription);
  const adjustable = running && subscription.tier !== null && subscription.cap !== null;
  const tOverage = useTranslations("Dashboard.overage");
  const { cap, usage, overageAllowed } = subscription;
  // Sans prix de dépassement, le choix n'existe pas : l'assistant s'arrête
  // au forfait (pausesAtLimit), on l'explique sans proposer l'interrupteur.
  const overagePriced = cap !== null && cap.overageUnitPriceCents > 0;
  const pausedByQuota =
    cap !== null &&
    pausesAtLimit(cap, overageAllowed) &&
    usage !== null &&
    usage.consumedUnits >= cap.includedUnits;
  const overageDescriptionId = `${BILLING_SECTION_ID}-depassement`;

  return (
    <Card id={BILLING_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border text-sm">
          <BillingRow label={t("plan")}>
            <MonthlyPrice cents={subscription.monthlyPriceCents} />
            {running && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {labels.period(subscription.period)}
              </span>
            )}
          </BillingRow>

          {subscription.cap && (
            <BillingRow
              label={t("included")}
              action={
                adjustable && (
                  <ChangeQuotaDialog
                    clientServiceId={subscription.clientServiceId}
                    tier={subscription.tier!}
                    currentUnits={subscription.cap.includedUnits}
                  />
                )
              }
            >
              {t.rich("perMonth", {
                units: price.usageUnits(subscription.cap.includedUnits, subscription.cap.unit),
                volume: (chunks) => <span className="font-mono tabular-nums">{chunks}</span>,
              })}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {price.usageCap(subscription.cap)}
              </span>
            </BillingRow>
          )}

          {cap && (
            <BillingRow
              label={tOverage("label")}
              action={
                running &&
                overagePriced && (
                  <OverageSwitch
                    clientServiceId={subscription.clientServiceId}
                    allowed={overageAllowed}
                    describedBy={overageDescriptionId}
                  />
                )
              }
            >
              <span id={overageDescriptionId}>
                {!overagePriced
                  ? tOverage("notAvailable", { included: price.usageUnits(cap.includedUnits, cap.unit) })
                  : overageAllowed
                    ? tOverage("accepted", {
                        included: price.usageUnits(cap.includedUnits, cap.unit),
                        price: price.perUnit(cap.overageUnitPriceCents, cap.unit),
                      })
                    : tOverage("refused", { included: price.usageUnits(cap.includedUnits, cap.unit) })}
              </span>
              {pausedByQuota && (
                <span role="status" className="mt-1 block font-medium text-destructive">
                  {tOverage("paused")}
                </span>
              )}
            </BillingRow>
          )}

          <BillingRow
            label={t("paymentMethod")}
            action={running && <BillingPortalButton organizationId={organizationId} size="sm" />}
          >
            <span className="text-muted-foreground">{t("paymentMethodValue")}</span>
          </BillingRow>

          <BillingRow label={t("invoicing")}>
            {labels.nextCharge(subscription, price.withVat(subscription.monthlyPriceCents))}
            <Link
              href="/dashboard/payments"
              className="mt-0.5 block text-xs text-primary underline-offset-4 hover:underline"
            >
              {t("invoices")}
            </Link>
          </BillingRow>
        </dl>
      </CardContent>
    </Card>
  );
}

// Fiche technique : libellé à gauche, valeur au centre, action à droite.
function BillingRow({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
      {action ? <dd className="sm:justify-self-end">{action}</dd> : null}
    </div>
  );
}
