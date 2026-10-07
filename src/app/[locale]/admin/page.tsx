import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { Suspense } from "react";
import { Stats } from "./stats";
import { ClientsSection } from "./clients-section";
import { ClientsFilters } from "./clients-filters";
import { LiveRefreshToggle } from "./live-refresh-toggle";
import { StatsSkeleton, ClientsSectionSkeleton } from "./admin-skeletons";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("admin");

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; scope?: string; page?: string }>;
}) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin.overview")]);

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<LiveRefreshToggle />}
      />

      <div>
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t("clientsHeading")}</h2>
        <ClientsFilters />
        <Suspense
          key={`${params.q ?? ""}:${params.status ?? ""}:${params.scope ?? ""}:${params.page ?? ""}`}
          fallback={<ClientsSectionSkeleton />}
        >
          <ClientsSection
            q={params.q}
            status={params.status}
            scope={params.scope}
            page={params.page}
          />
        </Suspense>
      </div>
    </PageShell>
  );
}
