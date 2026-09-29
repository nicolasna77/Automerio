import { formatEuroAmount } from "@/lib/catalog";
import { excludingVatSuffix } from "@/lib/vat";
import { cn } from "@/lib/utils";

// Prix mensuel d'une solution : le montant en Plex Mono, l'unité en texte
// courant, le hors taxes rappelé dessous (DESIGN.md, Typographie).
export function MonthlyPrice({
  cents,
  showExcludingVat = true,
  className,
}: {
  cents: number;
  showExcludingVat?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-sm", className)}>
      <span className="font-mono tabular-nums text-foreground">{formatEuroAmount(cents)}</span>
      <span className="text-muted-foreground"> € TTC/mois</span>
      {showExcludingVat && (
        <span className="block text-xs text-muted-foreground">{excludingVatSuffix(cents)}</span>
      )}
    </p>
  );
}
