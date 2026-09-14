import type { Metadata } from "next";
import { Suspense } from "react";
import { Stats } from "./stats";
import { ClientsSection } from "./clients-section";
import { ClientsFilters } from "./clients-filters";
import { LiveRefreshToggle } from "./live-refresh-toggle";
import { StatsSkeleton, ClientsSectionSkeleton } from "./admin-skeletons";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Vue d&apos;ensemble
          </h1>
          <p className="mt-1 text-muted-foreground">
            Supervision de l&apos;ensemble des clients Automerio.
          </p>
        </div>
        <LiveRefreshToggle />
      </div>

      <div className="mt-6">
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Clients</h2>
        <ClientsFilters />
        <Suspense
          key={`${params.q ?? ""}:${params.status ?? ""}:${params.page ?? ""}`}
          fallback={<ClientsSectionSkeleton />}
        >
          <ClientsSection
            q={params.q}
            status={params.status}
            page={params.page}
          />
        </Suspense>
      </div>
    </div>
  );
}
