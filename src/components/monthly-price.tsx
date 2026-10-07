import { useTranslations } from "next-intl";
import { usePriceFormatter } from "@/hooks/use-price-formatter";
import { formatEuroAmount } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Prix mensuel d'une solution : le montant en DM Mono, l'unité en texte
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
  const t = useTranslations("Price");
  const price = usePriceFormatter();
  return (
    <p className={cn("text-sm", className)}>
      <span className="font-mono tabular-nums text-foreground">{formatEuroAmount(cents)}</span>
      <span className="text-muted-foreground">{t("perMonthUnit")}</span>
      {showExcludingVat && (
        <span className="block text-xs text-muted-foreground">{price.excludingVatSuffix(cents)}</span>
      )}
    </p>
  );
}
