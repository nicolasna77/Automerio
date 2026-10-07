import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { titleMetadata } from "@/i18n/metadata";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersFilters } from "./users-filters";
import { UsersSection } from "./users-section";
import { PageHeader, PageShell } from "@/components/page-shell";

export const generateMetadata = titleMetadata("adminUsers");

function UsersSectionSkeleton() {
  const t = useTranslations("Admin.skeletons");
  return (
    <Card role="status" aria-label={t("users")}>
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
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin.users")]);

  return (
    <PageShell size="wide">
      <PageHeader
        title={t("title")}
        description={t("description")}
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
