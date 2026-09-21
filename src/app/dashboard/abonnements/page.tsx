import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CreditCard, Layers, TriangleAlert, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { formatCents, formatDate } from "@/lib/catalog";
import {
  getMySubscriptions,
  isRunning,
  monthlyTotalCents,
  nextRenewal,
} from "@/lib/subscriptions";
import { BillingPortalButton } from "../paiements/billing-portal-button";
import { SubscriptionCard } from "./subscription-card";

export const metadata: Metadata = { title: "Abonnements" };

export default async function AbonnementsPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const [subscriptions, customer] = await Promise.all([
    getMySubscriptions(organization.id),
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    }),
  ]);

  const running = subscriptions.filter(isRunning);
  const stopped = subscriptions.filter((subscription) => !isRunning(subscription));
  const failing = running.filter((subscription) => subscription.paymentFailedAt !== null);
  const renewal = nextRenewal(subscriptions);

  const stats = [
    {
      icon: Layers,
      label: "Abonnements en cours",
      value: String(running.length),
    },
    {
      icon: Wallet,
      label: "Total mensuel",
      value: formatCents(monthlyTotalCents(subscriptions)),
    },
    {
      icon: CalendarClock,
      label: "Prochain prélèvement",
      value: renewal ? formatDate(renewal) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Abonnements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ce qui vous est prélevé chaque mois, et ce que vous avez consommé sur
            la période en cours.
          </p>
        </div>
        {customer.stripeCustomerId && <BillingPortalButton />}
      </div>

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
          {customer.stripeCustomerId && <BillingPortalButton variant="default" />}
        </div>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Vous n'avez aucun abonnement"
          description="Les solutions facturées au mois apparaîtront ici, avec leur quota d'usage."
          action={
            <Link
              href="/dashboard/prestations#catalogue"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Voir le catalogue
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <Card>
            <CardContent>
              <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="py-3 first:pt-0 sm:px-5 sm:py-0 sm:first:pt-0 sm:first:pl-0 sm:last:pr-0"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <stat.icon className="size-3.5 shrink-0" aria-hidden="true" />
                      {stat.label}
                    </div>
                    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {running.length > 0 && (
            <section aria-labelledby="abonnements-en-cours" className="space-y-3">
              <h2
                id="abonnements-en-cours"
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
            <section aria-labelledby="abonnements-inactifs" className="space-y-3">
              <div>
                <h2
                  id="abonnements-inactifs"
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
              href="/dashboard/paiements"
              className="text-primary underline-offset-4 hover:underline"
            >
              Paiements
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
