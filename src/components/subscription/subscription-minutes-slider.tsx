"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import {
  calculateMonthlyPriceCents,
  clampToStep,
  type SubscriptionTier,
} from "@/lib/subscription-pricing";

export function SubscriptionMinutesSlider({
  tier,
  value,
  onChange,
  label,
  disabled = false,
}: {
  tier: SubscriptionTier;
  value: number;
  onChange: (units: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const t = useTranslations("MinutesSlider");
  const price = usePriceFormatter();
  const priceCents = calculateMonthlyPriceCents(tier, value);
  const quantity = price.usageUnits(value, tier.unit);
  const atMin = value <= tier.minUnits;
  const atMax = value >= tier.maxUnits;

  function shift(by: number) {
    onChange(clampToStep(tier, value + by));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="text-center">
        <p className="font-mono text-3xl font-medium tabular-nums text-foreground">
          {quantity}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("perMonth")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => shift(-tier.stepUnits)}
          disabled={disabled || atMin}
          aria-label={t("remove", { units: price.usageUnits(tier.stepUnits, tier.unit) })}
        >
          <Minus aria-hidden="true" />
        </Button>

        <Slider
          className="flex-1"
          value={value}
          min={tier.minUnits}
          max={tier.maxUnits}
          step={tier.stepUnits}
          disabled={disabled}
          onValueChange={(next) =>
            onChange(clampToStep(tier, Array.isArray(next) ? next[0] : next))
          }
          getAriaLabel={() => label}
          getAriaValueText={(_formatted, units) =>
            t("valueText", {
              units: price.usageUnits(units, tier.unit),
              price: price.withVat(calculateMonthlyPriceCents(tier, units)),
            })
          }
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => shift(tier.stepUnits)}
          disabled={disabled || atMax}
          aria-label={t("add", { units: price.usageUnits(tier.stepUnits, tier.unit) })}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{price.usageUnits(tier.minUnits, tier.unit)}</span>
        <span>{price.usageUnits(tier.maxUnits, tier.unit)}</span>
      </div>

      <p
        role="status"
        aria-atomic="true"
        className="rounded-2xl bg-muted px-4 py-3 text-center"
      >
        <span className="block font-mono text-2xl font-medium tabular-nums text-foreground">
          {price.amountWithVat(priceCents)}
        </span>
        <span className="block text-xs text-muted-foreground">
          {price.excludingVatSuffix(priceCents)}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {t("perMonthFor", { units: quantity })}
        </span>
      </p>
    </div>
  );
}
