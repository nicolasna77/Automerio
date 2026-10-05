import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="content" role="status" aria-label="Chargement de l'organisation…">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />

      <div className="mt-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </PageShell>
  );
}
