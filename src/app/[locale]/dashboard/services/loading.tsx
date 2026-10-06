import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

// Reprend la disposition de la page : en-tête, onglets soulignés, tableau.
export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="wide" role="status" aria-label={t("services")}>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />
      <div className="mt-6 mb-6 flex gap-6 border-b border-border pb-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Skeleton className="h-10 w-full rounded-none" />
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="size-6 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="hidden h-5 w-24 md:block" />
              <Skeleton className="hidden h-5 w-28 md:block" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
