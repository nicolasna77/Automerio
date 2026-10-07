import { useFormatter, useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { cn } from "@/lib/utils";
import { overageUnits, usageRatio } from "@/lib/usage-cap";
import { isNearQuota } from "@/lib/quota";
import type { QuotaUsage } from "@/lib/subscriptions";

export type QuotaState = QuotaUsage;

// Version compacte de la jauge des abonnements, pour une ligne de la liste
// des solutions : consommé sur inclus en tête, la barre dessous. Elle prend
// toute la largeur sur mobile et se limite à une colonne étroite au-delà.
export function QuotaMeter({ cap, consumedUnits }: QuotaState) {
  const t = useTranslations("Dashboard.subscriptions.gauge");
  const tList = useTranslations("Dashboard.services.list");
  const price = usePriceFormatter();
  const format = useFormatter();
  const over = overageUnits(consumedUnits, cap);
  const ratio = usageRatio(consumedUnits, cap);
  const nearLimit = isNearQuota(consumedUnits, cap.includedUnits);
  const consumed = price.usageUnits(consumedUnits, cap.unit);
  const included = price.usageUnits(cap.includedUnits, cap.unit);

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs" aria-hidden="true">
        <span className="tabular-nums text-muted-foreground">
          {tList.rich("quotaUsage", {
            consumed: format.number(consumedUnits),
            included,
            em: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            over > 0 ? "text-destructive" : nearLimit ? "text-attention" : "text-muted-foreground"
          )}
        >
          {/* Proche du forfait ou au-delà : une icône double la couleur. */}
          {(over > 0 || nearLimit) && (
            <TriangleAlert className="size-3 shrink-0 self-center" aria-hidden="true" />
          )}
          {over > 0
            ? tList("quotaOver", { units: price.usageUnits(over, cap.unit) })
            : format.number(ratio, { style: "percent", maximumFractionDigits: 0 })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={cap.includedUnits}
        aria-valuenow={Math.min(consumedUnits, cap.includedUnits)}
        aria-valuetext={t("valueText", { consumed, included })}
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full",
            over > 0 ? "bg-destructive" : nearLimit ? "bg-attention" : "bg-primary"
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
