import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement des statistiques…"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function ClientsSectionSkeleton() {
  return (
    <Card role="status" aria-label="Chargement des clients…">
      <CardHeader className="space-y-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
            <Skeleton className="h-5 w-48 rounded-full" />
          </div>
        ))}
      </CardHeader>
    </Card>
  );
}

export function HelpRequestsSectionSkeleton() {
  return (
    <div role="status" aria-label="Chargement des demandes…" className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-64 rounded-md" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
