import { titleMetadata } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { CalendarClock, CreditCard, Layers, TriangleAlert, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { EmptyState } from "@/components/empty-state";
import { requireActiveOrganization } from "@/lib/organization";
import { formatDate, formatEuroAmount } from "@/lib/catalog";
import { organizationCustomerId } from "@/lib/organization-billing";
import {
  getMySubscriptions,
  isRunning,
  monthlyTotalCents,
  nextRenewal,
} from "@/lib/subscriptions";
import { BillingPortalButton } from "../payments/billing-portal-button";
import { SubscriptionCard } from "./subscription-card";
import { excludingVatSuffix } from "@/lib/vat";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("subscriptions");

export default async function AbonnementsPage() {
  const { active: organization } = await requireActiveOrganization();
  const [subscriptions, customerId] = await Promise.all([
    getMySubscriptions(organization.id),
    organizationCustomerId(organization.id),
  ]);

  const running = subscriptions.filter(isRunning);
  const stopped = subscriptions.filter((subscription) => !isRunning(subscription));
  const failing = running.filter((subscription) => subscription.paymentFailedAt !== null);
  const renewal = nextRenewal(subscriptions);
  const total = monthlyTotalCents(subscriptions);

  const stats: Stat[] = [
    {
      icon: Layers,
      label: "Abonnements en cours",
      value: String(running.length),
    },
    {
      icon: Wallet,
      label: "Total mensuel",
      value: formatEuroAmount(total),
      unit: "€ TTC/mois",
      note: excludingVatSuffix(total),
    },
    {
      icon: CalendarClock,
      label: "Prochain prélèvement",
      value: renewal ? formatDate(renewal) : "Aucun",
      mono: false,
    },
  ];

  return (
    <PageShell size="content">
      <PageHeader
        title="Abonnements"
        description="Ce qui vous est prélevé chaque mois, et ce que vous avez consommé sur la période en cours."
        actions={customerId && <BillingPortalButton organizationId={organization.id} />}
      />

      {failing.length > 0 && (
        <div
          role="alert"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span>
              Le dernier paiement de{" "}
              {failing.map((subscription) => `« ${subscription.name} »`).join(", ")} a
              été refusé. Mettez à jour votre moyen de paiement pour éviter une
              interruption.
            </span>
          </p>
          {customerId && (
            <BillingPortalButton organizationId={organization.id} variant="default" />
          )}
        </div>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Vous n'avez aucun abonnement"
          description="Les solutions facturées au mois apparaîtront ici, avec leur quota d'usage."
          action={
            <Link
              href="/dashboard/services/catalog"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Voir le catalogue
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <StatStrip stats={stats} />

          {running.length > 0 && (
            <section aria-labelledby="active-subscriptions" className="space-y-3">
              <h2
                id="active-subscriptions"
                className="text-lg font-semibold text-foreground"
              >
                En cours
              </h2>
              {running.map((subscription) => (
                <SubscriptionCard
                  key={subscription.clientServiceId}
                  subscription={subscription}
                />
              ))}
            </section>
          )}

          {stopped.length > 0 && (
            <section aria-labelledby="inactive-subscriptions" className="space-y-3">
              <div>
                <h2
                  id="inactive-subscriptions"
                  className="text-lg font-semibold text-foreground"
                >
                  Inactifs
                </h2>
                <p className="text-sm text-muted-foreground">
                  Résiliés ou jamais démarrés : aucun prélèvement en cours.
                </p>
              </div>
              {stopped.map((subscription) => (
                <SubscriptionCard
                  key={subscription.clientServiceId}
                  subscription={subscription}
                />
              ))}
            </section>
          )}

          <p className="text-sm text-muted-foreground">
            Le détail de chaque prélèvement et vos factures se trouvent dans{" "}
            <Link
              href="/dashboard/payments"
              className="text-primary underline underline-offset-4"
            >
              Paiements
            </Link>
            .
          </p>
        </div>
      )}
    </PageShell>
  );
}
