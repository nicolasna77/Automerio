import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpRequestsSectionSkeleton } from "../admin-skeletons";
import { LiveRefreshToggle } from "../live-refresh-toggle";
import { HelpRequestsFilters } from "./help-requests-filters";
import { HelpRequestsSection } from "./help-requests-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Centre d'aide" };

export default async function AdminAidePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Centre d'aide"
        description="Demandes envoyées par les clients depuis leur tableau de bord."
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
