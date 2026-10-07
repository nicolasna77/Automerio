import { titleMetadata } from "@/i18n/metadata";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireActiveOrganization } from "@/lib/organization";
import { getCatalog } from "@/lib/get-catalog";
import { isWaitlistMode } from "@/lib/launch-mode";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ServiceCatalogGrid } from "../service-catalog-grid";
import { SolutionsTabs } from "../solutions-tabs";

export const generateMetadata = titleMetadata("catalog");

export default async function CataloguePage() {
  const [{ active: organization }, services, t] = await Promise.all([
    requireActiveOrganization(),
    getCatalog(),
    getTranslations("Dashboard.services"),
  ]);

  const activatedCount = await db.clientService.count({
    where: { organizationId: organization.id },
  });
  const catalog = services.filter((s) => s.category === "COMMUNICATION");
  const isFirst = activatedCount === 0;

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={isFirst ? t("catalog.firstDescription") : t("catalog.description")}
        className="mb-6"
      />
      <SolutionsTabs myCount={activatedCount} />

      <section aria-labelledby="catalog-heading">
        <h2 id="catalog-heading" className="sr-only">
          {t("catalog.heading")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("catalog.vatNote")}</p>
        <ServiceCatalogGrid services={catalog} showDetails={!isWaitlistMode()} />
      </section>
    </PageShell>
  );
}
