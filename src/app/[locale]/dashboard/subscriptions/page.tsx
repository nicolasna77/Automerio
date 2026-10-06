import { titleMetadata } from "@/i18n/metadata";
import { getPriceFormatter } from "@/lib/price-format-server";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClock, CreditCard, Layers, Wallet } from "lucide-react";
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
import { PaymentFailedAlert } from "../payments/payment-failed-alert";
import { BillingTabs } from "../billing-tabs";
import { SubscriptionCard } from "./subscription-card";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("subscriptions");

export default async function AbonnementsPage() {
  const { active: organization } = await requireActiveOrganization();
  const [subscriptions, customerId, t, tBilling] = await Promise.all([
    getMySubscriptions(organization.id),
    organizationCustomerId(organization.id),
    getTranslations("Dashboard.subscriptions"),
    getTranslations("Dashboard.billing"),
  ]);
  const price = await getPriceFormatter();

  const running = subscriptions.filter(isRunning);
  const stopped = subscriptions.filter((subscription) => !isRunning(subscription));
  const failing = running.filter((subscription) => subscription.paymentFailedAt !== null);
  const renewal = nextRenewal(subscriptions);
  const total = monthlyTotalCents(subscriptions);

  const stats: Stat[] = [
    {
      icon: Layers,
      label: t("stats.running"),
      value: String(running.length),
    },
    {
      icon: Wallet,
      label: t("stats.total"),
      value: formatEuroAmount(total),
      unit: t("stats.totalUnit"),
      note: price.excludingVatSuffix(total),
    },
    {
      icon: CalendarClock,
      label: t("stats.nextCharge"),
      value: renewal ? formatDate(renewal) : t("stats.none"),
      mono: false,
    },
  ];

  return (
    <PageShell size="content">
      <PageHeader
        title={tBilling("title")}
        description={tBilling("description")}
        actions={customerId && <BillingPortalButton organizationId={organization.id} />}
        className="mb-6"
      />
      <BillingTabs />

      <div className="mb-8 empty:hidden">
        <PaymentFailedAlert
          names={failing.map((subscription) => subscription.name)}
          organizationId={organization.id}
          canOpenPortal={Boolean(customerId)}
        />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("description")}</p>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Link
              href="/dashboard/services/catalog"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("empty.cta")}
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
                {t("running")}
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
                  {t("stopped")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("stoppedDescription")}</p>
              </div>
              {stopped.map((subscription) => (
                <SubscriptionCard
                  key={subscription.clientServiceId}
                  subscription={subscription}
                />
              ))}
            </section>
          )}

        </div>
      )}
    </PageShell>
  );
}
