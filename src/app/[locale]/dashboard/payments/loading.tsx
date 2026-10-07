import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  const t = useTranslations("Dashboard.loading");
  return (
    <PageShell size="wide" role="status" aria-label={t("payments")}>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-5 w-56" />
      <div className="mt-6 mb-6 flex gap-6 border-b border-border pb-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>

      <Card size="sm" className="px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3.5 w-24" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
