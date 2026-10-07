import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { quotasByService } from "@/lib/subscriptions";
import { toMyServiceDTO } from "./get-my-service";
import { getOverviewSubscriptions } from "./overview-data";
import { SolutionsTable } from "./solutions-table";

// Les solutions en cours, dans le même tableau que la page Solutions (statut,
// quota, tarif, mise en service à terminer), sans les filtres.
export async function OverviewServices({ organizationId }: { organizationId: string }) {
  const [t, rows, subscriptions] = await Promise.all([
    getTranslations("Dashboard.overview.services"),
    db.clientService.findMany({
      where: { organizationId, status: { not: "CANCELED" } },
      include: { service: true },
      orderBy: { createdAt: "desc" },
    }),
    getOverviewSubscriptions(organizationId),
  ]);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="overview-services-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="overview-services-heading" className="text-base font-semibold text-foreground">
          {t("title")}
        </h2>
        <Link
          href="/dashboard/services"
          className="relative touch-hitbox rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:focus-ring"
        >
          {t("seeAll")}
        </Link>
      </div>
      {/* Un paiement refusé est déjà signalé en tête de page. */}
      <SolutionsTable
        items={rows.map(toMyServiceDTO)}
        quotas={quotasByService(subscriptions)}
        showPaymentIssues={false}
      />
    </section>
  );
}
