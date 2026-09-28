import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" role="status" aria-label="Chargement de la configuration…">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-6 h-7 w-48" />
      <Skeleton className="mt-2 h-5 w-64" />
      <div className="mt-8 space-y-6">
        <Skeleton className="h-72 w-full rounded-4xl" />
        <Skeleton className="h-96 w-full rounded-4xl" />
      </div>
    </div>
  );
}
