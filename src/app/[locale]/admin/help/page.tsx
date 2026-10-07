import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { Suspense } from "react";
import { HelpRequestsSectionSkeleton } from "../admin-skeletons";
import { LiveRefreshToggle } from "../live-refresh-toggle";
import { HelpRequestsFilters } from "./help-requests-filters";
import { HelpRequestsSection } from "./help-requests-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminHelp");

export default async function AdminAidePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin.help")]);

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<LiveRefreshToggle />}
      />

      <div>
        <HelpRequestsFilters />
        <Suspense
          key={`${params.status ?? ""}:${params.page ?? ""}`}
          fallback={<HelpRequestsSectionSkeleton />}
        >
          <HelpRequestsSection status={params.status} page={params.page} />
        </Suspense>
      </div>
    </PageShell>
  );
}
