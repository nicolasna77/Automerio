import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatUsageUnits, overageUnits, usageRatio, type UsageCap, formatPerUnit } from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";
import { QUOTA_WARNING_RATIO } from "@/lib/quota";

export function UsageGauge({
  cap,
  consumedUnits,
  overageCents,
}: {
  cap: UsageCap;
  consumedUnits: number;
  overageCents: number;
}) {
  const t = useTranslations("Dashboard.subscriptions.gauge");
  const over = overageUnits(consumedUnits, cap);
  const ratio = usageRatio(consumedUnits, cap);
  const consumed = formatUsageUnits(consumedUnits, cap.unit);
  const included = formatUsageUnits(cap.includedUnits, cap.unit);
  const nearLimit = over === 0 && consumedUnits >= cap.includedUnits * QUOTA_WARNING_RATIO;

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

      <p className="mt-2 text-xs text-muted-foreground">
        {over > 0
          ? t.rich("over", {
              units: formatUsageUnits(over, cap.unit),
              amount: formatCentsWithVat(overageCents),
              em: (chunks) => <span className="font-medium text-foreground tabular-nums">{chunks}</span>,
            })
          : nearLimit && cap.overageUnitPriceCents > 0
            ? t.rich("nearLimit", {
                units: formatUsageUnits(cap.includedUnits - consumedUnits, cap.unit),
                price: formatPerUnit(cap.overageUnitPriceCents, cap.unit),
                strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })
            : t("remaining", { units: formatUsageUnits(cap.includedUnits - consumedUnits, cap.unit) })}
      </p>
    </div>
  );
}
