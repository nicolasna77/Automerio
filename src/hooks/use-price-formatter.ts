import { useLocale, useTranslations } from "next-intl";
import { createPriceFormatter } from "@/lib/price-format";

export function usePriceFormatter() {
  const t = useTranslations("Price");
  const locale = useLocale();
  return createPriceFormatter(t, locale);
}
