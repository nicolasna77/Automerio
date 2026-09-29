import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="wide" role="status" aria-label="Chargement du catalogue…">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />
      <div className="mt-6 mb-6 flex gap-6 border-b border-border pb-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>

      <Skeleton className="mt-8 h-4 w-56" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    </PageShell>
  );
}
