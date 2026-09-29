import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewStatsSkeleton() {
  return (
    <Card role="status" aria-label="Chargement des chiffres…">
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

export function SpendChartSkeleton() {
  return (
    <Card role="status" aria-label="Chargement du graphique…">
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
