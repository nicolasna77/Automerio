"use client";

import { useTranslations } from "next-intl";
import { RefreshCwOff } from "lucide-react";

// Région d'état toujours présente, vide tant que l'actualisation fonctionne :
// un lecteur d'écran annonce le message dès qu'il apparaît.
export function PollingStatus({ stalled }: { stalled: boolean }) {
  const t = useTranslations("Common");
  return (
    <p role="status" className="flex items-center empty:sr-only gap-1.5 text-sm text-attention">
      {stalled && (
        <>
          <RefreshCwOff className="size-4 shrink-0" aria-hidden="true" />
          {t("pollingStalled")}
        </>
      )}
    </p>
  );
}
