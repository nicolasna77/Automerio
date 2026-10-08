import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { cn } from "@/lib/utils";
import { overageUnits, usageRatio, type UsageCap } from "@/lib/usage-cap";
import { isNearQuota } from "@/lib/quota";

export function UsageGauge({
  cap,
  consumedUnits,
  overageCents,
  pausesAtLimit = false,
}: {
  cap: UsageCap;
  consumedUnits: number;
  overageCents: number;
  // Dépassement refusé : l'assistant se met en pause au lieu de facturer.
  pausesAtLimit?: boolean;
}) {
  const t = useTranslations("Dashboard.subscriptions.gauge");
  const price = usePriceFormatter();
  const over = overageUnits(consumedUnits, cap);
  const ratio = usageRatio(consumedUnits, cap);
  const consumed = price.usageUnits(consumedUnits, cap.unit);
  const included = price.usageUnits(cap.includedUnits, cap.unit);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm text-muted-foreground">{t("consumed")}</span>
        <span className="text-sm tabular-nums text-foreground">
          <span className="font-medium">{consumed}</span>
          <span className="text-muted-foreground">{t("of", { included })}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={cap.includedUnits}
        aria-valuenow={Math.min(consumedUnits, cap.includedUnits)}
        aria-valuetext={t("valueText", { consumed, included })}
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            over > 0 ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

      <UsageNote
        cap={cap}
        consumedUnits={consumedUnits}
        overageCents={overageCents}
        pausesAtLimit={pausesAtLimit}
        className="mt-2"
      />
    </div>
  );
}

// Ce que la consommation implique : reste à consommer, dépassement facturé
// (montant), pause à venir ou en cours. Sous la jauge des abonnements et sous
// le quota de la page d'une solution.
export function UsageNote({
  cap,
  consumedUnits,
  overageCents,
  pausesAtLimit = false,
  className,
}: {
  cap: UsageCap;
  consumedUnits: number;
  overageCents: number;
  pausesAtLimit?: boolean;
  className?: string;
}) {
  const t = useTranslations("Dashboard.subscriptions.gauge");
  const tOverage = useTranslations("Dashboard.overage");
  const price = usePriceFormatter();
  const over = overageUnits(consumedUnits, cap);
  const nearLimit = isNearQuota(consumedUnits, cap.includedUnits);

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {pausesAtLimit && consumedUnits >= cap.includedUnits ? (
        <span className="font-medium text-destructive">{tOverage("paused")}</span>
      ) : pausesAtLimit && nearLimit ? (
        <>
          <span className="font-medium text-foreground">
            {tOverage("remaining", { remaining: price.usageUnits(cap.includedUnits - consumedUnits, cap.unit) })}
          </span>{" "}
          {tOverage("pausesSoon")}
        </>
      ) : over > 0
        ? t.rich("over", {
            units: price.usageUnits(over, cap.unit),
            amount: price.withVat(overageCents),
            em: (chunks) => <span className="font-medium text-foreground tabular-nums">{chunks}</span>,
          })
        : nearLimit && cap.overageUnitPriceCents > 0
          ? t.rich("nearLimit", {
              units: price.usageUnits(cap.includedUnits - consumedUnits, cap.unit),
              price: price.perUnit(cap.overageUnitPriceCents, cap.unit),
              strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })
          : t("remaining", { units: price.usageUnits(cap.includedUnits - consumedUnits, cap.unit) })}
    </p>
  );
}
