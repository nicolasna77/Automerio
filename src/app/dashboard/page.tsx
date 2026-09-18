import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/catalog";
import { OverviewStats } from "./overview-stats";
import { OverviewServices } from "./overview-services";
import { SpendChart } from "./spend-chart";
import { OverviewStatsSkeleton, SpendChartSkeleton } from "./overview-skeletons";

export const metadata: Metadata = { title: "Tableau de bord" };

const GETTING_STARTED = [
  {
    title: "Choisissez une solution",
    description:
      "Standard téléphonique, prise de rendez-vous ou de commande, assistants WhatsApp, Messenger ou Instagram.",
  },
  {
    title: "Réglez-la et payez en ligne",
    description: "Horaires, consignes, numéro : quelques minutes suffisent. Paiement sécurisé par Stripe.",
  },
  {
    title: "L'équipe l'installe et la vérifie",
    description: "La plupart des solutions sont actives en quelques jours. Vous suivez l'avancement ici.",
  },
];

export default async function DashboardPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const hasEverActivated =
    (await db.clientService.count({ where: { organizationId: organization.id } })) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bonjour {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      {hasEverActivated ? (
        <div className="space-y-4">
          <Suspense fallback={<OverviewStatsSkeleton />}>
            <OverviewStats organizationId={organization.id} />
          </Suspense>
          <Suspense fallback={null}>
            <OverviewServices organizationId={organization.id} />
          </Suspense>
          <Suspense fallback={<SpendChartSkeleton />}>
            <SpendChart userId={session.user.id} organizationId={organization.id} />
          </Suspense>
        </div>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base">Mettez en place votre première automatisation</CardTitle>
            <CardDescription>
              Vos appels, vos rendez-vous et vos dépenses s&apos;afficheront ici dès qu&apos;une
              solution sera active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-5">
              {GETTING_STARTED.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/dashboard/prestations#catalogue" className={buttonVariants({ className: "mt-6" })}>
              Voir le catalogue
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
