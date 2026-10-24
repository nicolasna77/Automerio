"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Figure } from "@/components/figure";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import {
  calculateMonthlyPriceCents,
  clampToStep,
  type SubscriptionTier,
} from "@/lib/subscription-pricing";
import { nearestStop, sliderStops } from "@/lib/slider-stops";

export function SubscriptionMinutesSlider({
  tier,
  value,
  onChange,
  label,
  disabled = false,
  showPrice = true,
}: {
  tier: SubscriptionTier;
  value: number;
  onChange: (units: number) => void;
  label: string;
  disabled?: boolean;
  // false quand le prix est déjà affiché à côté (récapitulatif de commande).
  showPrice?: boolean;
}) {
  const t = useTranslations("MinutesSlider");
  const price = usePriceFormatter();
  const stops = sliderStops(tier);
  const priceCents = calculateMonthlyPriceCents(tier, value);
  const quantity = price.usageUnits(value, tier.unit);
  const atMin = value <= tier.minUnits;
  const atMax = value >= tier.maxUnits;
  // Annonce pour les lecteurs d'écran : une fois le curseur lâché ou le bouton
  // pressé, pas à chaque cran pendant qu'on glisse.
  const [announced, setAnnounced] = useState("");

  function describe(units: number) {
    return t("valueText", {
      units: price.usageUnits(units, tier.unit),
      price: price.withVat(calculateMonthlyPriceCents(tier, units)),
    });
  }

  function shift(by: number) {
    const next = clampToStep(tier, value + by);
    onChange(next);
    setAnnounced(describe(next));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="text-center">
        <Figure
          text={quantity}
          className="block text-3xl font-medium text-foreground"
          unitClassName="text-lg text-muted-foreground"
        />
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
          value={nearestStop(stops, value)}
          min={0}
          max={stops.length - 1}
          step={1}
          disabled={disabled}
          onValueChange={(next) => onChange(stops[Array.isArray(next) ? next[0] : next])}
          onValueCommitted={(next) => {
            if (showPrice) setAnnounced(describe(stops[Array.isArray(next) ? next[0] : next]));
          }}
          getAriaLabel={() => label}
          getAriaValueText={(_formatted, index) => describe(stops[index])}
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

      <div className="flex justify-between text-[13px] tabular-nums text-muted-foreground">
        <span>{price.usageUnits(tier.minUnits, tier.unit)}</span>
        <span>{price.usageUnits(tier.maxUnits, tier.unit)}</span>
      </div>

      {showPrice && (
        <>
          <p className="rounded-lg bg-muted px-4 py-3 text-center">
            <Figure
              text={price.amountWithVat(priceCents)}
              className="block text-2xl font-medium text-foreground"
              unitClassName="text-base text-muted-foreground"
            />
            <span className="block text-[13px] text-muted-foreground">
              {price.excludingVatSuffix(priceCents)}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {t("perMonthFor", { units: quantity })}
            </span>
          </p>
          <p role="status" aria-atomic="true" className="sr-only">
            {announced}
          </p>
        </>
      )}
    </div>
  );
}
