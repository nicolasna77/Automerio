"use client";

import { useState } from "react";
import { Check, Copy, PhoneForwarded } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LineType = "mobile" | "fixe";
type BoxOperator = "orange" | "sfr" | "bouygues" | "free" | "autre";

const BOX_OPERATORS: { value: BoxOperator; label: string }[] = [
  { value: "orange", label: "Orange (Livebox)" },
  { value: "sfr", label: "SFR" },
  { value: "bouygues", label: "Bouygues Telecom (Bbox)" },
  { value: "free", label: "Free (Freebox)" },
  { value: "autre", label: "Autre opérateur" },
];

const BOX_INSTRUCTIONS: Record<BoxOperator, string> = {
  orange:
    "Espace client Orange (orange.fr ou l'application Orange et moi), rubrique Assistance > Téléphone fixe > Renvoi d'appel.",
  sfr: "Espace client SFR (sfr.fr ou l'application SFR et moi), rubrique Mes services > Ligne fixe > Renvoi d'appel.",
  bouygues:
    "Espace client Bouygues Telecom (bouyguestelecom.fr), rubrique Assistance > Bbox et Internet > Téléphone.",
  free: "Interface Freebox OS (mafreebox.freebox.fr), rubrique Téléphonie.",
  autre:
    "Espace client en ligne de votre opérateur, généralement dans une rubrique « Téléphone fixe » ou « Ligne fixe ».",
};

function MobileInstructions({ targetNumber }: { targetNumber: string }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Ces codes fonctionnent à l&apos;identique chez tous les opérateurs
        mobiles français (Orange, SFR, Bouygues Telecom, Free Mobile) :
        composez-les comme un numéro de téléphone, puis appuyez sur la touche
        d&apos;appel.
      </p>
      <ul className="space-y-1.5">
        <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-foreground">
            Activer le renvoi de tous les appels
          </span>
          <code className="shrink-0 font-mono text-xs tabular-nums text-foreground">
            **21*{targetNumber}#
          </code>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-foreground">Désactiver le renvoi</span>
          <code className="shrink-0 font-mono text-xs text-foreground">
            ##21#
          </code>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        Vous préférez garder la main quand vous êtes disponible ? Utilisez un
        renvoi conditionnel à la place :{" "}
        <code className="font-mono">**61*{targetNumber}#</code> (pas de
        réponse), <code className="font-mono">**62*{targetNumber}#</code>{" "}
        (hors réseau) ou <code className="font-mono">**67*{targetNumber}#</code>{" "}
        (occupé). Si un code ne fonctionne pas depuis votre téléphone,
        l&apos;application ou l&apos;espace client de votre opérateur propose
        la même option sous « Renvoi d&apos;appel ».
      </p>
    </div>
  );
}

function FixedLineInstructions({ targetNumber }: { targetNumber: string }) {
  const [operator, setOperator] = useState<BoxOperator>("orange");

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {BOX_OPERATORS.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant="outline"
            size="xs"
            className={cn(
              operator === item.value && "border-primary bg-primary/10 text-primary"
            )}
            aria-pressed={operator === item.value}
            onClick={() => setOperator(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground">{BOX_INSTRUCTIONS[operator]}</p>
      <p className="text-xs text-muted-foreground">
        Certaines box acceptent aussi un raccourci direct depuis le combiné
        fixe : composez <code className="font-mono">*21*{targetNumber}#</code>{" "}
        puis décrochez. Si ça ne fonctionne pas, passez par l&apos;interface
        ci-dessus — ou demandez à votre opérateur un « renvoi permanent
        (inconditionnel) » vers ce numéro.
      </p>
    </div>
  );
}

export function CallForwardingGuide({ targetNumber }: { targetNumber: string }) {
  const [lineType, setLineType] = useState<LineType>("mobile");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(targetNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <PhoneForwarded
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Gardez votre numéro actuel
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pas besoin de changer de numéro ni de portabilité : vos clients
              continuent d&apos;appeler celui qu&apos;ils connaissent déjà.
              Activez simplement un renvoi d&apos;appel depuis votre ligne
              vers le numéro ci-dessous, et l&apos;IA prend le relais.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <span className="flex-1 font-mono text-sm tabular-nums text-foreground">
              {targetNumber}
            </span>
            <Button type="button" size="xs" variant="ghost" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check aria-hidden="true" data-icon="inline-start" />
                  Copié
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" data-icon="inline-start" />
                  Copier
                </>
              )}
            </Button>
          </div>

          <div className="inline-flex items-center gap-0.5 rounded-4xl border border-border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn(lineType === "mobile" && "bg-muted text-foreground")}
              aria-pressed={lineType === "mobile"}
              onClick={() => setLineType("mobile")}
            >
              Ligne mobile
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn(lineType === "fixe" && "bg-muted text-foreground")}
              aria-pressed={lineType === "fixe"}
              onClick={() => setLineType("fixe")}
            >
              Ligne fixe / box
            </Button>
          </div>

          {lineType === "mobile" ? (
            <MobileInstructions targetNumber={targetNumber} />
          ) : (
            <FixedLineInstructions targetNumber={targetNumber} />
          )}
        </div>
      </div>
    </div>
  );
}
