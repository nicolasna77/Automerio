import type { Messages } from "next-intl";
import { formatCents } from "@/lib/catalog";
import { PRICE_BLOCK_UNITS, type UsageCap, type UsageUnit } from "@/lib/usage-cap";
import { centsExcludingVat } from "@/lib/vat";

type PriceKey = keyof Messages["Price"];

export type PriceTranslator = (key: PriceKey, values?: Record<string, string | number>) => string;

export type PriceFormatter = ReturnType<typeof createPriceFormatter>;

export function createPriceFormatter(t: PriceTranslator, locale: string) {
  const cents = (value: number) => formatCents(value, locale);
  const withVat = (inclusive: number) =>
    t("withVat", { inclusive: cents(inclusive), exclusive: cents(centsExcludingVat(inclusive)) });
  return {
    cents,
    withVat,
    excludingVatSuffix: (inclusive: number) =>
      t("excludingVatSuffix", { exclusive: cents(centsExcludingVat(inclusive)) }),
    perMonth: (monthly: number | null) =>
      monthly === null ? t("none") : t("perMonth", { amount: cents(monthly) }),
    perMonthWithVat: (inclusive: number) => t("perMonthWithVat", { amount: cents(inclusive) }),
    amountWithVat: (inclusive: number) => t("amountWithVat", { amount: cents(inclusive) }),
    usageUnits: (count: number, unit: UsageUnit) => t("units", { count, unit }),
    included: (cap: UsageCap) => t("included", { count: cap.includedUnits, unit: cap.unit }),
    perUnit: (cents: number, unit: UsageUnit) =>
      t("perUnit", { price: withVat(cents), unit, block: PRICE_BLOCK_UNITS[unit] }),
    usageCap: (cap: UsageCap) => {
      const included = t("included", { count: cap.includedUnits, unit: cap.unit });
      if (cap.overageUnitPriceCents <= 0) return included;
      if (PRICE_BLOCK_UNITS[cap.unit] > 1) {
        return t("overageBlock", {
          included,
          price: withVat(cap.overageUnitPriceCents),
          block: PRICE_BLOCK_UNITS[cap.unit],
        });
      }
      return t("overage", { included, price: withVat(cap.overageUnitPriceCents), unit: cap.unit });
    },
  };
}
