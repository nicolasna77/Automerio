"use client";

import { useState } from "react";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { formatUsageUnits } from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";
import type { SubscriptionTier } from "@/lib/subscription-pricing";

/**
 * Le meme curseur qu'a l'activation, sur la page publique d'une solution.
 *
 * Ici il ne vend rien : il laisse un visiteur chiffrer son besoin avant de
 * creer un compte. C'est l'objection la plus courante — « combien ca me
 * couterait, a moi » — et y repondre sur la page evite de la reporter apres
 * l'inscription.
 *
 * Le choix n'est pas transporte jusqu'a la commande : le visiteur le refera a
 * l'activation, ou le serveur le validera. Transmettre une valeur depuis une
 * page publique jusqu'a une facture demanderait de lui faire confiance, ce
 * qu'on ne fait nulle part ailleurs.
 */
export function ServicePriceSimulator({
  tier,
  overageUnitPriceCents,
}: {
  tier: SubscriptionTier;
  overageUnitPriceCents: number;
}) {
  const [units, setUnits] = useState(tier.minUnits);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          Combien de minutes vous faut-il ?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Déplacez le curseur pour voir ce que votre abonnement coûterait.
        </p>
      </div>

      <SubscriptionMinutesSlider tier={tier} value={units} onChange={setUnits} />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Au-delà de ce quota, chaque minute est facturée{" "}
        {formatCentsWithVat(overageUnitPriceCents)}. L&apos;inclure à
        l&apos;avance revient à {formatCentsWithVat(tier.extraUnitPriceCents)} la
        minute, et vous pourrez ajuster ce volume à l&apos;activation.
      </p>
      <p className="sr-only">
        Minimum {formatUsageUnits(tier.minUnits, tier.unit)}, maximum{" "}
        {formatUsageUnits(tier.maxUnits, tier.unit)}.
      </p>
    </div>
  );
}
