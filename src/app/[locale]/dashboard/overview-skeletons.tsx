import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewStatsSkeleton() {
  const t = useTranslations("Dashboard.overview.stats");
  return (
    <Card role="status" aria-label={t("loading")}>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 first:pt-0 sm:px-5 sm:py-0 sm:first:pl-0">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-2 h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewServicesSkeleton() {
  const t = useTranslations("Dashboard.loading");
  return (
    <div role="status" aria-label={t("services")} className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <Card className="gap-0 py-0">
        <Skeleton className="h-10 w-full rounded-none" />
        <div className="divide-y divide-border">
          {Array.from({ length: 2 }).map((_, i) => (
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
      </Card>
    </div>
  );
}

export function SpendChartSkeleton() {
  const t = useTranslations("Dashboard.overview.spend");
  return (
    <Card role="status" aria-label={t("loading")}>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  );
}
