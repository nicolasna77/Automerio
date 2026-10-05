import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="form" role="status" aria-label="Chargement du profil…">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-5 w-64" />

      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    </PageShell>
  );
}
