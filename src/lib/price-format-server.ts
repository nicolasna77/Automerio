import { getLocale, getTranslations } from "next-intl/server";
import { createPriceFormatter } from "@/lib/price-format";

export async function getPriceFormatter() {
  const [t, locale] = await Promise.all([getTranslations("Price"), getLocale()]);
  return createPriceFormatter(t, locale);
}
