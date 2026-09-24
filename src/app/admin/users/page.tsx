import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersFilters } from "./users-filters";
import { UsersSection } from "./users-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Utilisateurs" };

function UsersSectionSkeleton() {
  return (
    <Card role="status" aria-label="Chargement des utilisateurs…">
      <CardHeader className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded-md" />
        ))}
      </CardHeader>
    </Card>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell size="wide">
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes de l'application — rôles, bannissement, sessions."
      />

      <UsersFilters />
      <Suspense
        key={`${params.q ?? ""}:${params.role ?? ""}:${params.page ?? ""}`}
        fallback={<UsersSectionSkeleton />}
      >
        <UsersSection q={params.q} role={params.role} page={params.page} />
      </Suspense>
    </PageShell>
  );
}
