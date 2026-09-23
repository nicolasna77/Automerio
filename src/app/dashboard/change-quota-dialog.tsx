"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { changeSubscriptionQuota } from "@/app/dashboard/actions";

/**
 * Changer le volume d'un abonnement en cours.
 *
 * La difference est annoncee avant d'etre prelevee : le client augmente au
 * milieu d'un mois qu'il a deja paye, et decouvrir le prorata sur son releve
 * serait une mauvaise surprise meme quand le montant est juste. Le montant
 * exact vient de Stripe apres coup — celui-ci n'est qu'une estimation, et le
 * texte le dit.
 */
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
            ? `Volume porté à ${formatUsageUnits(units, tier.unit)}. ${formatCentsWithVat(
                immediateChargeCents
              )} prélevés pour la fin du mois en cours.`
            : `Volume porté à ${formatUsageUnits(units, tier.unit)}.`
        );
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, "Le changement n'a pas pu être appliqué."));
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
        Modifier le volume
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le volume de l&apos;abonnement</DialogTitle>
            <DialogDescription>
              Le changement prend effet immédiatement. La différence est calculée
              au prorata des jours restants du mois en cours.
            </DialogDescription>
          </DialogHeader>

          <SubscriptionMinutesSlider
            tier={tier}
            value={units}
            onChange={setUnits}
            label="Combien de minutes vous faut-il ?"
            disabled={pending}
          />

          <p className="text-sm text-muted-foreground">
            {unchanged ? (
              <>C&apos;est votre volume actuel.</>
            ) : nextPrice > currentPrice ? (
              <>
                Votre abonnement passe de {formatCentsWithVat(currentPrice)} à{" "}
                {formatCentsWithVat(nextPrice)} par mois. Une facture de
                régularisation, calculée sur les jours restants, sera prélevée
                aujourd&apos;hui.
              </>
            ) : (
              <>
                Votre abonnement passe de {formatCentsWithVat(currentPrice)} à{" "}
                {formatCentsWithVat(nextPrice)} par mois. Le trop-perçu des jours
                restants vous est recrédité.
              </>
            )}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={pending || unchanged}>
              {pending ? "Application…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
