import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="wide" role="status" aria-label="Chargement de l'aide…">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="mt-2 h-5 w-80" />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </PageShell>
  );
}
