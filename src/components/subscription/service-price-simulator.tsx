"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import type { SubscriptionTier } from "@/lib/subscription-pricing";
import { activationPath, authPathWithNext } from "@/lib/safe-redirect";

export function ServicePriceSimulator({
  tier,
  overageUnitPriceCents,
  slug,
  signedIn,
}: {
  tier: SubscriptionTier;
  overageUnitPriceCents: number;
  slug: string;
  signedIn: boolean;
}) {
  const t = useTranslations("PriceSimulator");
  const price = usePriceFormatter();
  const [units, setUnits] = useState(tier.minUnits);
  const activation = activationPath(slug, units);
  const href = signedIn ? activation : authPathWithNext("/signup", activation);

  return (
    <div className="space-y-4">
      <SubscriptionMinutesSlider
        tier={tier}
        value={units}
        onChange={setUnits}
        label={t("question", { unit: tier.unit })}
      />
      <p className="text-sm text-muted-foreground">
        {t("hint")}
      </p>

      <div className="space-y-2">
        <Link href={href} className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("continueWith", { units: price.usageUnits(units, tier.unit) })}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {signedIn ? t("signedInNote") : t("signedOutNote")}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("overage", {
          overage: price.perUnit(overageUnitPriceCents, tier.unit),
          extra: price.perUnit(tier.extraUnitPriceCents, tier.unit),
        })}
      </p>
      <p className="sr-only">
        {t("bounds", {
          min: price.usageUnits(tier.minUnits, tier.unit),
          max: price.usageUnits(tier.maxUnits, tier.unit),
        })}
      </p>
    </div>
  );
}
