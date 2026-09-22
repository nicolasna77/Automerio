import { cn } from "@/lib/utils";
import {
  formatUsageUnits,
  overageUnits,
  usageRatio,
  type UsageCap,
} from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";

export function UsageGauge({
  cap,
  consumedUnits,
  overageCents,
}: {
  cap: UsageCap;
  consumedUnits: number;
  overageCents: number;
}) {
  const over = overageUnits(consumedUnits, cap);
  const ratio = usageRatio(consumedUnits, cap);
  const consumed = formatUsageUnits(consumedUnits, cap.unit);
  const included = formatUsageUnits(cap.includedUnits, cap.unit);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm text-muted-foreground">Quota consommé</span>
        <span className="text-sm tabular-nums text-foreground">
          <span className="font-medium">{consumed}</span>
          <span className="text-muted-foreground"> / {included}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Quota consommé sur la période"
        aria-valuemin={0}
        aria-valuemax={cap.includedUnits}
        aria-valuenow={Math.min(consumedUnits, cap.includedUnits)}
        aria-valuetext={`${consumed} sur ${included}`}
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
        {over > 0 ? (
          <>
            {formatUsageUnits(over, cap.unit)} au-delà du forfait —{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCentsWithVat(overageCents)}
            </span>{" "}
            s&apos;ajouteront à la prochaine facture.
          </>
        ) : (
          <>
            Il vous reste {formatUsageUnits(cap.includedUnits - consumedUnits, cap.unit)}{" "}
            sur cette période.
          </>
        )}
      </p>
    </div>
  );
}
