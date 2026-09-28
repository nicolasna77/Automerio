import type { Metadata } from "next";
import { Suspense } from "react";
import { Stats } from "./stats";
import { ClientsSection } from "./clients-section";
import { ClientsFilters } from "./clients-filters";
import { LiveRefreshToggle } from "./live-refresh-toggle";
import { StatsSkeleton, ClientsSectionSkeleton } from "./admin-skeletons";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; scope?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Vue d'ensemble"
        description="Supervision de l'ensemble des clients Automerio."
        actions={<LiveRefreshToggle />}
      />

      <div>
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Clients</h2>
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
