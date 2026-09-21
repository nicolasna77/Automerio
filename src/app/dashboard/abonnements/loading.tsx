import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6"
      role="status"
      aria-label="Chargement des abonnements…"
    >
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-5 w-72" />

      <Skeleton className="mt-8 h-24 w-full rounded-4xl" />

      <div className="mt-8 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-4xl" />
        ))}
      </div>
    </div>
  );
}
