import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/catalog";
import { OverviewStats } from "./overview-stats";
import { OverviewServices } from "./overview-services";
import { SpendChart } from "./spend-chart";
import { OverviewStatsSkeleton, SpendChartSkeleton } from "./overview-skeletons";

export const metadata: Metadata = { title: "Tableau de bord" };

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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Bonjour {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
          {formatDate(new Date())}
        </p>
      </div>

      {!hasEverActivated && (
        <div className="mb-8">
          <EmptyState
            icon={Sparkles}
            title="Aucune automatisation activée pour l'instant"
            description="Choisissez une solution dans le catalogue pour démarrer."
            action={
              <Link
                href="/dashboard/prestations#prestations-disponibles"
                className={buttonVariants()}
              >
                Découvrir les solutions
              </Link>
            }
          />
        </div>
      )}

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
    </div>
  );
}
