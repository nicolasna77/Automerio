"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatUsageUnits } from "@/lib/usage-cap";
import { formatCents } from "@/lib/catalog";
import { excludingVatSuffix, formatCentsWithVat } from "@/lib/vat";
import {
  calculateMonthlyPriceCents,
  clampToStep,
  type SubscriptionTier,
} from "@/lib/subscription-pricing";

/**
 * Le curseur par lequel le client choisit son quota.
 *
 * Il ne connait aucun prix : il recoit les bornes et rend le calcul a
 * `subscription-pricing`, pour qu'un changement de tarif ne demande pas d'y
 * revenir. Il ne decide rien non plus — le serveur recalcule et revalide avant
 * de facturer quoi que ce soit.
 *
 * Trois details qui ne sont pas du confort. Les boutons moins et plus ne sont
 * pas une commodite : WCAG 2.2 demande une alternative au glissement pour qui
 * manie un pointeur sans pouvoir trainer. Le prix est annonce comme un statut
 * complet — « 200 minutes, 89 € par mois » — plutot que comme un nombre nu,
 * qu'un lecteur d'ecran enoncerait sans dire de quoi il parle.
 *
 * Et le libelle appartient au composant plutot qu'a ses appelants. Affiche et
 * enonce depuis la meme chaine, il ne peut pas diverger : commander « combien
 * de minutes » a la voix trouve le curseur, ce qui ne serait pas le cas si le
 * texte visible et le nom accessible etaient ecrits a deux endroits.
 */
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
  /** Affiche au-dessus du curseur, et donne son nom a la commande. */
  label: string;
  disabled?: boolean;
}) {
  const priceCents = calculateMonthlyPriceCents(tier, value);
  const quantity = formatUsageUnits(value, tier.unit);
  const atMin = value <= tier.minUnits;
  const atMax = value >= tier.maxUnits;

  function shift(by: number) {
    onChange(clampToStep(tier, value + by));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="text-center">
        <p className="text-3xl font-semibold tabular-nums text-foreground">
          {quantity}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">par mois</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => shift(-tier.stepUnits)}
          disabled={disabled || atMin}
          aria-label={`Retirer ${formatUsageUnits(tier.stepUnits, tier.unit)}`}
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
            `${formatUsageUnits(units, tier.unit)}, ${formatCentsWithVat(
              calculateMonthlyPriceCents(tier, units)
            )} par mois`
          }
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => shift(tier.stepUnits)}
          disabled={disabled || atMax}
          aria-label={`Ajouter ${formatUsageUnits(tier.stepUnits, tier.unit)}`}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatUsageUnits(tier.minUnits, tier.unit)}</span>
        <span>{formatUsageUnits(tier.maxUnits, tier.unit)}</span>
      </div>

      {/* Un statut, non un nombre : ce qui est annonce doit se comprendre seul. */}
      <p
        role="status"
        aria-atomic="true"
        className="rounded-2xl bg-muted px-4 py-3 text-center"
      >
        {/* TTC en tete, HT dessous : la forme en ligne se coupe en deux dans
            une colonne etroite, et c'est la convention du reste du site. */}
        <span className="block text-2xl font-semibold tabular-nums text-foreground">
          {formatCents(priceCents)} TTC
        </span>
        <span className="block text-xs text-muted-foreground">
          {excludingVatSuffix(priceCents)}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          par mois, pour {quantity}
        </span>
      </p>
    </div>
  );
}
