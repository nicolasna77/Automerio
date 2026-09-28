"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const POLL_INTERVAL_MS = 15_000;

export function UsageCounter({ clientServiceId }: { clientServiceId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/client-services/${clientServiceId}/usage`
        );
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (!cancelled) setCount(data.count);
      } catch {
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientServiceId]);

  if (count === null) {
    return (
      <div
        role="status"
        aria-label="Chargement de l'usage…"
        className="mt-3 flex items-center gap-2 rounded-2xl bg-muted p-3"
      >
        <Skeleton className="size-1.5 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className="mt-3 flex items-center gap-2 rounded-2xl bg-muted p-3 text-sm"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
      />
      <span>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {count}
        </span>{" "}
        appel{count === 1 ? "" : "s"} reçu{count === 1 ? "" : "s"} ce mois-ci
      </span>
    </div>
  );
}
