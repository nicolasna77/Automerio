import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Chargement de la solution…">
      <Skeleton className="h-5 w-40" />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="size-11 shrink-0 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    </div>
  );
}
