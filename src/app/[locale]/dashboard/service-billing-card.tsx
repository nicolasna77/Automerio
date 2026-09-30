import { CreditCard } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyPrice } from "@/components/monthly-price";
import { formatUsageCap, formatUsageUnits } from "@/lib/usage-cap";
import { describeNextCharge, describePeriod, isRunning, type MySubscription } from "@/lib/subscriptions";
import { ChangeQuotaDialog } from "./change-quota-dialog";
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
  const running = isRunning(subscription);
  const adjustable = running && subscription.tier !== null && subscription.cap !== null;

  return (
    <Card id={BILLING_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base">
              Abonnement
            </CardTitle>
            <CardDescription>
              Ces changements s&apos;appliquent tout de suite, sans passer par « Enregistrer ».
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border text-sm">
          <BillingRow label="Formule">
            <MonthlyPrice cents={subscription.monthlyPriceCents} />
            {running && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {describePeriod(subscription)}
              </span>
            )}
          </BillingRow>

          {subscription.cap && (
            <BillingRow
              label="Volume inclus"
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
              <span className="font-mono tabular-nums">
                {formatUsageUnits(subscription.cap.includedUnits, subscription.cap.unit)}
              </span>{" "}
              par mois
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {formatUsageCap(subscription.cap)}
              </span>
            </BillingRow>
          )}

          <BillingRow
            label="Moyen de paiement"
            action={running && <BillingPortalButton organizationId={organizationId} size="sm" />}
          >
            <span className="text-muted-foreground">Carte ou prélèvement, géré de façon sécurisée par Stripe.</span>
          </BillingRow>

          <BillingRow label="Facturation">
            {describeNextCharge(subscription)}
            <Link
              href="/dashboard/payments"
              className="mt-0.5 block text-xs text-primary underline-offset-4 hover:underline"
            >
              Voir mes factures
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
