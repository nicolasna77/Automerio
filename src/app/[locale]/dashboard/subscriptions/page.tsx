import { titleMetadata } from "@/i18n/metadata";
import { getPriceFormatter } from "@/lib/price-format-server";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
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
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("subscriptions");

export default async function AbonnementsPage() {
  const { active: organization } = await requireActiveOrganization();
  const [subscriptions, customerId, t] = await Promise.all([
    getMySubscriptions(organization.id),
    organizationCustomerId(organization.id),
    getTranslations("Dashboard.subscriptions"),
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
        title={t("title")}
        description={t("description")}
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
              {t("failing", {
                names: failing.map((subscription) => t("quoted", { name: subscription.name })).join(", "),
              })}
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

          <p className="text-sm text-muted-foreground">
            {t.rich("paymentsLink", {
              link: (chunks) => (
                <Link href="/dashboard/payments" className="text-primary underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      )}
    </PageShell>
  );
}
