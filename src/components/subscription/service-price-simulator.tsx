"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SubscriptionMinutesSlider } from "@/components/subscription/subscription-minutes-slider";
import { formatUsageUnits } from "@/lib/usage-cap";
import { formatCentsWithVat } from "@/lib/vat";
import type { SubscriptionTier } from "@/lib/subscription-pricing";
import { activationPath, authPathWithNext } from "@/lib/safe-redirect";

/**
 * Le meme curseur qu'a l'activation, sur la page publique d'une solution.
 *
 * Ici il ne vend rien : il laisse un visiteur chiffrer son besoin avant de
 * creer un compte. C'est l'objection la plus courante — « combien ca me
 * couterait, a moi » — et y repondre sur la page evite de la reporter apres
 * l'inscription.
 *
 * Le volume choisi suit le visiteur jusqu'a l'activation, a travers
 * l'inscription ou la connexion, pour qu'il n'ait pas a le refaire. Il n'y
 * arrive que comme valeur de depart du curseur : l'URL n'engage a rien, la page
 * d'activation le ramene dans les bornes et le serveur revalide le quota avant
 * de facturer, comme pour tout choix fait dans le navigateur.
 */
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
  const [units, setUnits] = useState(tier.minUnits);
  const activation = activationPath(slug, units);
  const href = signedIn ? activation : authPathWithNext("/signup", activation);

  return (
    <div className="space-y-4">
      <SubscriptionMinutesSlider
        tier={tier}
        value={units}
        onChange={setUnits}
        label="Combien de minutes vous faut-il ?"
      />
      <p className="text-sm text-muted-foreground">
        Déplacez le curseur pour voir ce que votre abonnement coûterait.
      </p>

      <div className="space-y-2">
        <Link href={href} className={buttonVariants({ size: "lg", className: "w-full" })}>
          Continuer avec {formatUsageUnits(units, tier.unit)}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {signedIn
            ? "Vous retrouvez ce volume à l'activation, avant tout paiement."
            : "Créez votre compte ou connectez-vous : ce volume vous attendra à l'activation, avant tout paiement."}
        </p>
      </div>

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
