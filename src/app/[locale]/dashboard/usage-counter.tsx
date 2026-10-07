"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pollWhileVisible } from "@/lib/poll-while-visible";

const POLL_INTERVAL_MS = 15_000;

// « block » : encadré sur fond gris ; « inline » : une ligne sans encadré,
// pour le pied d'une carte de la liste.
export function UsageCounter({
  clientServiceId,
  variant = "block",
}: {
  clientServiceId: string;
  variant?: "block" | "inline";
}) {
  const t = useTranslations("Dashboard.service.usage");
  const box = variant === "block" ? "rounded-lg bg-muted p-3" : "";
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/client-services/${clientServiceId}/usage`
        );
        if (!res.ok) return false;
        const data: { count: number } = await res.json();
        if (!cancelled) setCount(data.count);
      } catch {
        return false;
      }
    }

    poll();
    const stopPolling = pollWhileVisible(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [clientServiceId]);

  if (count === null) {
    return (
      <div
        role="status"
        aria-label={t("loading")}
        className={cn("flex items-center gap-2", box)}
      >
        <Skeleton className="size-1.5 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={cn("flex items-center gap-2 text-sm", box)}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-primary"
      />
      <span>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {count}
        </span>{" "}
        {t("callsThisMonth", { count })}
      </span>
    </div>
  );
}
