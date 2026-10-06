import { titleMetadata } from "@/i18n/metadata";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewStats } from "./overview-stats";
import { OverviewServices } from "./overview-services";
import { PendingCallbacks } from "./pending-callbacks";
import { SpendChart } from "./spend-chart";
import { OverviewStatsSkeleton, SpendChartSkeleton } from "./overview-skeletons";
import { PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("dashboard");

const GETTING_STARTED = ["choose", "configure", "install"] as const;

export default async function DashboardPage() {
  const [, { active: organization }, t, tStart] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
    getTranslations("PageTitles"),
    getTranslations("Dashboard.overview.gettingStarted"),
  ]);
  const hasEverActivated =
    (await db.clientService.count({ where: { organizationId: organization.id } })) > 0;

  return (
    <PageShell size="wide">
      {/* Pas d'en-tête visible : la page s'ouvre directement sur l'activité. */}
      <h1 className="sr-only">{t("dashboard")}</h1>

      {hasEverActivated ? (
        <div className="space-y-4">
          <Suspense fallback={null}>
            <PendingCallbacks organizationId={organization.id} />
          </Suspense>
          <Suspense fallback={<OverviewStatsSkeleton />}>
            <OverviewStats organizationId={organization.id} />
          </Suspense>
          <Suspense fallback={null}>
            <OverviewServices organizationId={organization.id} />
          </Suspense>
          <Suspense fallback={<SpendChartSkeleton />}>
            <SpendChart organizationId={organization.id} />
          </Suspense>
        </div>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle as="h2" className="text-base">{tStart("title")}</CardTitle>
            <CardDescription>{tStart("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-5">
              {GETTING_STARTED.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{tStart(`steps.${step}.title`)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{tStart(`steps.${step}.description`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/dashboard/services/catalog" className={buttonVariants({ className: "mt-6" })}>
              {tStart("cta")}
            </Link>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
