import type { Messages } from "next-intl";
import { formatCents } from "@/lib/catalog";
import type { UsageCap, UsageUnit } from "@/lib/usage-cap";
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
    usageUnits: (count: number, unit: UsageUnit) => t("units", { count, unit }),
    usageCap: (cap: UsageCap) => {
      const included = t("included", { count: cap.includedUnits, unit: cap.unit });
      if (cap.overageUnitPriceCents <= 0) return included;
      return t("overage", { included, price: withVat(cap.overageUnitPriceCents), unit: cap.unit });
    },
  };
}
