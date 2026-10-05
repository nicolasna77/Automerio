import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="full" role="status" aria-label="Chargement du calendrier…">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-5 w-80" />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-52" />
      </div>
      <Skeleton className="mt-3 h-[32rem] w-full rounded-lg" />
    </PageShell>
  );
}
