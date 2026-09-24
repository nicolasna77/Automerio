import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Chargement du catalogue…">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />
      <Skeleton className="mt-6 h-12 w-64 rounded-full" />

      <Skeleton className="mt-8 h-4 w-56" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
