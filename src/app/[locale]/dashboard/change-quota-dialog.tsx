"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { formatUsageUnits } from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";
import {
  calculateMonthlyPriceCents,
  type SubscriptionTier,
} from "@/lib/subscription-pricing";
import { changeSubscriptionQuota } from "@/app/[locale]/dashboard/actions";

export function ChangeQuotaDialog({
  clientServiceId,
  tier,
  currentUnits,
}: {
  clientServiceId: string;
  tier: SubscriptionTier;
  currentUnits: number;
}) {
  const router = useRouter();
  const tSimulator = useTranslations("PriceSimulator");
  const t = useTranslations("Dashboard.quota");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState(currentUnits);
  const [pending, startTransition] = useTransition();

  const currentPrice = calculateMonthlyPriceCents(tier, currentUnits);
  const nextPrice = calculateMonthlyPriceCents(tier, units);
  const unchanged = units === currentUnits;

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { immediateChargeCents } = unwrap(
          await changeSubscriptionQuota(clientServiceId, units)
        );
        toast.success(
          immediateChargeCents > 0
            ? t("raisedWithCharge", {
                volume: formatUsageUnits(units, tier.unit),
                amount: formatCentsWithVat(immediateChargeCents),
              })
            : t("changed", { volume: formatUsageUnits(units, tier.unit) })
        );
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t("failed")));
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setUnits(currentUnits);
          setOpen(true);
        }}
      >
        <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
        {t("open")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <SubscriptionMinutesSlider
            tier={tier}
            value={units}
            onChange={setUnits}
            label={tSimulator("question", { unit: tier.unit })}
            disabled={pending}
          />

          <p className="text-sm text-muted-foreground">
            {unchanged
              ? t("unchanged")
              : t(nextPrice > currentPrice ? "increase" : "decrease", {
                  from: formatCentsWithVat(currentPrice),
                  to: formatCentsWithVat(nextPrice),
                })}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={pending || unchanged}>
              {pending ? t("applying") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
